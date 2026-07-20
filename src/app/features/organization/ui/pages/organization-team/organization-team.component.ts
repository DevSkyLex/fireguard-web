import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationTeamStore } from '@features/organization/state/organization-team';
import {
  OrganizationRoleForm,
  type OrganizationRoleFormValues,
} from '@features/organization/ui/forms';
import { OrganizationRoleTable } from '@features/organization/ui/tables';
import type { PermissionMatrixRow } from './models';

/**
 * Page OrganizationTeamPage
 *
 * @description
 * Roles & permissions administration for the active organization: a selectable
 * role-card list beside a permission matrix for the viewed role, with an
 * on-demand create/edit form replacing the matrix. Member and invitation
 * management lives on the dedicated members page.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-team',
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    TableModule,
    OrganizationRoleForm,
    OrganizationRoleTable,
  ],
  providers: [OrganizationTeamStore],
  templateUrl: './organization-team.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamPage {
  /** PrimeNG confirmation service for destructive role operations. */
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Page-scoped team workflow store. */
  protected readonly store: OrganizationTeamStore = inject(OrganizationTeamStore);
  /** Role currently selected for editing. */
  protected readonly selectedRole: WritableSignal<OrganizationRoleOutput | null> = signal(null);
  /** Whether the create/edit role form replaces the permission matrix. */
  protected readonly roleFormVisible: WritableSignal<boolean> = signal(false);
  /** Identifier of the role whose permissions are being consulted. */
  private readonly viewedRoleId: WritableSignal<string | null> = signal(null);

  /** Localized fallback for the load-error banner. */
  protected readonly loadErrorFallback: string = $localize`:@@org.team.loadError:The team administration data could not be loaded.`;
  /** Localized fallback for the mutation-error banner. */
  protected readonly mutationErrorFallback: string = $localize`:@@org.team.mutationError:The team operation could not be completed.`;
  /** Localized accessible label for a granted permission mark. */
  protected readonly allowedLabel: string = $localize`:@@org.team.matrixAllowed:Allowed`;
  /** Localized accessible label for a denied permission mark. */
  protected readonly notAllowedLabel: string = $localize`:@@org.team.matrixNotAllowed:Not allowed`;

  /** Whether the active member can manage organization roles. */
  protected readonly canManageRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /** Role whose permissions the matrix displays (falls back to the first role). */
  protected readonly viewedRole: Signal<OrganizationRoleOutput | null> = computed(() => {
    const roles = this.store.roles();
    const id = this.viewedRoleId();
    return roles.find((role) => role.id === id) ?? roles[0] ?? null;
  });

  /**
   * Every known permission name: the catalog when loaded (managers), otherwise
   * the union of the permissions granted across all roles (read-only members).
   */
  private readonly knownPermissionNames: Signal<readonly string[]> = computed(() => {
    const catalog = this.store.permissions();
    if (catalog.length > 0) return catalog.map((permission) => permission.name);
    const seen: string[] = [];
    for (const role of this.store.roles()) {
      // A role's permissions are `{ name, description }` objects, not names.
      for (const permission of role.permissions) {
        if (!seen.includes(permission.name)) seen.push(permission.name);
      }
    }
    return seen;
  });

  /** Distinct permission actions, ordered read → create → update → delete → manage. */
  protected readonly matrixActions: Signal<readonly string[]> = computed(() => {
    const preferredOrder: readonly string[] = ['read', 'create', 'update', 'delete', 'manage'];
    const actions: string[] = [];
    for (const name of this.knownPermissionNames()) {
      const action = this.permissionAction(name);
      if (action && !actions.includes(action)) actions.push(action);
    }
    return actions.toSorted((a, b) => {
      const rankA = preferredOrder.indexOf(a);
      const rankB = preferredOrder.indexOf(b);
      return (
        (rankA === -1 ? preferredOrder.length : rankA) -
          (rankB === -1 ? preferredOrder.length : rankB) || a.localeCompare(b)
      );
    });
  });

  /** Permission matrix rows (one per resource) for the viewed role. */
  protected readonly matrixRows: Signal<readonly PermissionMatrixRow[]> = computed(() => {
    const names = this.knownPermissionNames();
    const actions = this.matrixActions();
    const available = new Set(names);
    const granted = new Set(
      (this.viewedRole()?.permissions ?? []).map((permission) => permission.name),
    );
    const resources: string[] = [];
    for (const name of names) {
      const resource = this.permissionResource(name);
      if (!resources.includes(resource)) resources.push(resource);
    }
    return resources.map((resource) => ({
      resource,
      label: (resource.includes('.')
        ? resource.slice(resource.indexOf('.') + 1)
        : resource
      ).replace(/[._-]/g, ' '),
      cells: actions.map((action) => {
        const name = `${resource}.${action}`;
        return {
          action,
          state: available.has(name) ? (granted.has(name) ? 'granted' : 'denied') : 'absent',
        } as const;
      }),
    }));
  });

  /** Number of permissions granted to the viewed role. */
  protected readonly matrixGrantedCount: Signal<number> = computed(
    () => this.viewedRole()?.permissions.length ?? 0,
  );

  /** Total number of known permissions the matrix covers. */
  protected readonly matrixTotalCount: Signal<number> = computed(
    () => this.knownPermissionNames().length,
  );

  /**
   * Localized role-form card header, depending on edit vs create mode.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {string} Localized card header.
   */
  protected roleCardHeader(): string {
    return this.selectedRole()
      ? $localize`:@@org.team.editRoleCard:Edit role`
      : $localize`:@@org.roleForm.create:Create role`;
  }

  /** Initializes the role resources visible to the active member. */
  public constructor() {
    this.reload();
  }

  /** Reloads roles and (when manageable) the permission catalog. */
  protected reload(): void {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    this.store.load({
      organizationId,
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: this.canManageRoles(),
    });
  }

  /** Shows the requested role in the matrix and leaves any edit in progress. */
  protected onSelectRole(role: OrganizationRoleOutput): void {
    this.viewedRoleId.set(role.id);
    this.selectedRole.set(null);
    this.roleFormVisible.set(false);
  }

  /** Opens the role form in create mode. */
  protected openCreateRole(): void {
    this.selectedRole.set(null);
    this.roleFormVisible.set(true);
  }

  /** Opens the role form in edit mode for the currently viewed role. */
  protected openEditRole(): void {
    const role = this.viewedRole();
    if (!role) return;
    this.selectedRole.set(role);
    this.roleFormVisible.set(true);
  }

  /** Closes the role form without saving. */
  protected onRoleFormCancelled(): void {
    this.selectedRole.set(null);
    this.roleFormVisible.set(false);
  }

  /** Creates a role or updates the currently selected role, then closes the form. */
  protected saveRole(values: OrganizationRoleFormValues): void {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    const role = this.selectedRole();
    if (role) {
      this.store.updateRole({
        organizationId,
        roleId: role.id,
        input: { description: values.description || null, permissions: values.permissions },
      });
      this.selectedRole.set(null);
    } else {
      this.store.createRole({
        organizationId,
        input: {
          name: values.name,
          description: values.description,
          permissions: values.permissions,
        },
      });
    }
    this.roleFormVisible.set(false);
  }

  /** Confirms and removes a non-system organization role. */
  protected removeRole(role: OrganizationRoleOutput): void {
    if (role.isSystem) return;
    this.confirmationService.confirm({
      header: $localize`:@@org.team.deleteRoleHeader:Delete role`,
      message: $localize`:@@org.team.deleteRoleMessage:Delete role "${role.name}:role:"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.delete:Delete`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        const organizationId = this.organizationId();
        if (organizationId) this.store.removeRole({ organizationId, roleId: role.id });
      },
    });
  }

  /** Extracts the resource segment (everything before the last dot) of a permission name. */
  private permissionResource(name: string): string {
    const separator = name.lastIndexOf('.');
    return separator > 0 ? name.slice(0, separator) : name;
  }

  /** Extracts the action segment (after the last dot) of a permission name. */
  private permissionAction(name: string): string {
    const separator = name.lastIndexOf('.');
    return separator > 0 ? name.slice(separator + 1) : '';
  }

  /** Returns the active organization identifier when available. */
  private organizationId(): string | undefined {
    return this.activeOrganizationStore.selectedOrganization()?.id;
  }
}
