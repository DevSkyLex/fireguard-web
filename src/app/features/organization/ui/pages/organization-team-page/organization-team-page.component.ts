import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucidePlus, lucideShieldPlus } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { CallState, StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CreateOrganizationRoleInput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationTeamStore,
  type OrganizationTeamStoreType,
} from '@features/organization/state/organization-team';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { OrganizationRoleGrid } from '../../dataviews/organization-role-grid';
import { OrganizationRoleCreateDialog } from '../../dialogs/organization-role-create-dialog';
import { OrganizationRolePermissionsSheet } from '../../sheets/organization-role-permissions-sheet';

/** Which surface's write is currently attributed the shared mutation state, so a stale error from one dialog cannot leak into another. */
type PendingMutation = 'create' | 'delete' | 'permissions' | null;

/**
 * Component OrganizationTeamPage
 * @class OrganizationTeamPage
 *
 * @description
 * Route entry page for the organization's roles and permissions
 * (`/organizations/:organizationId/team`, gated by `organization.roles.*`).
 * Renders every role — system and custom — through {@link OrganizationRoleGrid};
 * a member holding `organization.roles.manage` can create a role
 * ({@link OrganizationRoleCreateDialog}), edit a custom role's permissions
 * ({@link OrganizationRolePermissionsSheet}), or delete a custom role
 * (a page-owned `hlm-alert-dialog`, the only overlay of the three simple
 * enough not to earn its own component — `ARCHITECTURE.md` §2.9).
 *
 * `OrganizationTeamStore` is component-scoped and asks only for roles and
 * the permission catalog (`includeMembers`/`includeInvitations: false`) —
 * this page owns roles and permissions only, not membership. The store's
 * `mutationCallState` is shared across every write it exposes, so this page
 * tracks which surface is currently attributed it ({@link PendingMutation})
 * to close the right dialog on success and show an error only where it
 * belongs, rather than trusting a bare "last call failed" signal.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * { path: 'team', component: OrganizationTeamPage }
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-page',
  imports: [
    NgIcon,
    EmptyState,
    OrganizationRoleCreateDialog,
    OrganizationRoleGrid,
    OrganizationRolePermissionsSheet,
    HlmButton,
    ...HlmAlertDialogImports,
  ],
  providers: [
    OrganizationTeamStore,
    provideIcons({ lucideCircleAlert, lucidePlus, lucideShieldPlus }),
  ],
  templateUrl: './organization-team-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose roles are managed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** Roles and the permission catalog for the active organization. */
  protected readonly store: OrganizationTeamStoreType =
    inject<OrganizationTeamStoreType>(OrganizationTeamStore);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Whether the acting member may create, edit or delete a custom role. */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /** The organization's custom (non-system) roles, deciding the empty-state CTA. */
  protected readonly customRoles: Signal<readonly OrganizationRoleOutput[]> = computed(
    (): readonly OrganizationRoleOutput[] => this.store.roles().filter((role) => !role.isSystem),
  );

  /** Whether the create-role dialog is open. */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The role id whose permission editor is open, or `null` when closed. */
  protected readonly editingRoleId: WritableSignal<string | null> = signal<string | null>(null);

  /** The role the delete confirmation targets, or `null` when closed. */
  protected readonly pendingDeleteRole: WritableSignal<OrganizationRoleOutput | null> =
    signal<OrganizationRoleOutput | null>(null);

  /** Which surface's write the shared mutation state currently belongs to. */
  protected readonly activeMutation: WritableSignal<PendingMutation> =
    signal<PendingMutation>(null);

  /**
   * Property editingRole
   * @readonly
   * @description The role open in the permission editor, read live from the store so a saved toggle reflects immediately.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationRoleOutput | null>}
   */
  protected readonly editingRole: Signal<OrganizationRoleOutput | null> = computed(
    (): OrganizationRoleOutput | null => {
      const id: string | null = this.editingRoleId();
      if (id === null) return null;

      return this.store.roles().find((role) => role.id === id) ?? null;
    },
  );

  /** The create dialog's error, attributed only while it owns the shared mutation state. */
  protected readonly createDialogError: Signal<StoreError | null> = computed<StoreError | null>(
    () => (this.activeMutation() === 'create' ? this.store.mutationError() : null),
  );

  /** The permission editor's error, attributed only while it owns the shared mutation state. */
  protected readonly permissionsSheetError: Signal<StoreError | null> = computed<StoreError | null>(
    () => (this.activeMutation() === 'permissions' ? this.store.mutationError() : null),
  );

  /** The delete confirmation's error, attributed only while it owns the shared mutation state. */
  protected readonly deleteDialogError: Signal<StoreError | null> = computed<StoreError | null>(
    () => (this.activeMutation() === 'delete' ? this.store.mutationError() : null),
  );

  /**
   * Property deleteDialogState
   * @readonly
   * @description The confirm dialog's open/closed state, derived from {@link pendingDeleteRole}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDeleteRole() !== null ? 'open' : 'closed',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads this organization's roles and permission catalog once, and closes
   * whichever of the create dialog or the delete confirmation is open once
   * its write settles successfully. The permission editor is deliberately
   * left open on success — an operator toggling several permissions in a
   * row should not have the panel close under them after the first one.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.store.load({
          organizationId,
          includeMembers: false,
          includeRoles: true,
          includeInvitations: false,
          includePermissions: true,
        });
      });
    });

    effect((): void => {
      const callState: CallState = this.store.mutationCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        const kind: PendingMutation = this.activeMutation();
        if (kind === 'create') this.createDialogVisible.set(false);
        if (kind === 'delete') this.pendingDeleteRole.set(null);
        this.activeMutation.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-runs the current load, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      includeMembers: false,
      includeRoles: true,
      includeInvitations: false,
      includePermissions: true,
    });
  }

  /**
   * Method openCreateDialog
   * @description Opens the create-role dialog, forgetting any earlier attribution error.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openCreateDialog(): void {
    this.activeMutation.set(null);
    this.createDialogVisible.set(true);
  }

  /**
   * Method onCreateDialogVisibleChange
   * @description Tracks the create dialog's own open/closed state.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - Whether the dialog is open.
   * @returns {void}
   */
  protected onCreateDialogVisibleChange(visible: boolean): void {
    this.createDialogVisible.set(visible);
  }

  /**
   * Method createRole
   * @description Sends the validated payload from the create form.
   * @access protected
   * @since 1.0.0
   * @param {CreateOrganizationRoleInput} payload - The role to create.
   * @returns {void}
   */
  protected createRole(payload: CreateOrganizationRoleInput): void {
    this.activeMutation.set('create');
    this.store.createRole({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method openPermissionsEditor
   * @description Opens the permission editor for a role, forgetting any earlier attribution error.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationRoleOutput} role - The role to edit.
   * @returns {void}
   */
  protected openPermissionsEditor(role: OrganizationRoleOutput): void {
    this.activeMutation.set(null);
    this.editingRoleId.set(role.id);
  }

  /**
   * Method onPermissionsSheetVisibleChange
   * @description Closes the permission editor, clearing which role it was open for.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - Whether the panel is open.
   * @returns {void}
   */
  protected onPermissionsSheetVisibleChange(visible: boolean): void {
    if (!visible) this.editingRoleId.set(null);
  }

  /**
   * Method updatePermissions
   * @description Applies the permission editor's next full permission list to the role being edited.
   * @access protected
   * @since 1.0.0
   * @param {ReadonlyArray<string>} nextPermissions - The role's next full permission list.
   * @returns {void}
   */
  protected updatePermissions(nextPermissions: ReadonlyArray<string>): void {
    const roleId: string | null = this.editingRoleId();
    if (roleId === null) return;

    this.activeMutation.set('permissions');
    this.store.updateRole({
      organizationId: this.organizationId(),
      roleId,
      input: { permissions: nextPermissions },
    });
  }

  /**
   * Method requestDelete
   * @description Opens the Delete confirmation for a custom role, forgetting any earlier attribution error.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationRoleOutput} role - The role to delete.
   * @returns {void}
   */
  protected requestDelete(role: OrganizationRoleOutput): void {
    this.activeMutation.set(null);
    this.pendingDeleteRole.set(role);
  }

  /**
   * Method confirmDelete
   * @description Sends the delete write. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDelete(): void {
    const role: OrganizationRoleOutput | null = this.pendingDeleteRole();
    if (role === null) return;

    this.activeMutation.set('delete');
    this.store.removeRole({ organizationId: this.organizationId(), roleId: role.id });
  }

  /**
   * Method onDeleteDialogStateChanged
   * @description Clears the pending role on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingDeleteRole.set(null);
  }
  //#endregion
}
