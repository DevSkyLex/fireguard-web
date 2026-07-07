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

/**
 * Page OrganizationTeamPage
 *
 * @description
 * Roles & permissions administration for the active organization. Member and
 * invitation management moved to the dedicated members page; this page owns role
 * definitions only.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-team',
  imports: [CardModule, ButtonModule, MessageModule, OrganizationRoleForm, OrganizationRoleTable],
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

  /** Localized fallback for the load-error banner. */
  protected readonly loadErrorFallback: string = $localize`:@@org.team.loadError:The team administration data could not be loaded.`;
  /** Localized fallback for the mutation-error banner. */
  protected readonly mutationErrorFallback: string = $localize`:@@org.team.mutationError:The team operation could not be completed.`;

  /** Whether the active member can manage organization roles. */
  protected readonly canManageRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
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

  /** Creates a role or updates the currently selected role. */
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

  /** Returns the active organization identifier when available. */
  private organizationId(): string | undefined {
    return this.activeOrganizationStore.selectedOrganization()?.id;
  }
}
