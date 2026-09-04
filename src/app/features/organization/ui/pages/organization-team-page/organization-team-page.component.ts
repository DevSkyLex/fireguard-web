import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideKeyRound,
  lucidePlus,
  lucideShield,
  lucideShieldPlus,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { PageActionsService, registerPageActions } from '@core/page-actions';
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
import { StatTile } from '@features/organization/ui/components';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { OrganizationRoleGrid } from '../../dataviews/organization-role-grid';
import { OrganizationRoleDeleteDialog } from '../../dialogs/organization-role-delete-dialog';
import { OrganizationRoleCreateSheet } from '../../sheets/organization-role-create-sheet';
import { OrganizationRolePermissionsSheet } from '../../sheets/organization-role-permissions-sheet';

/** Which surface's write is currently attributed the shared mutation state, so a stale error from one dialog cannot leak into another. */
type PendingMutation = 'create' | 'delete' | 'permissions' | null;

/**
 * Type OrganizationTeamKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the page's KPI row.
 *
 * @since 1.1.0
 */
type OrganizationTeamKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly loading: boolean;
};

/**
 * Component OrganizationTeamPage
 * @class OrganizationTeamPage
 *
 * @description
 * Mounted as the "Roles & permissions" tab of `OrganizationMembersPage`
 * (`/organizations/:organizationId/members?tab=roles`, gated by
 * `organization.roles.*`; the retired `/team` route redirects here). A KPI
 * row (total, custom and catalog counts) sits above
 * {@link OrganizationRoleGrid}, which itself splits the one loaded role list
 * into a System roles and a Custom roles section — so the custom-roles empty
 * state can never stack above a grid still full of system roles; a member
 * holding `organization.roles.manage` can create a role
 * ({@link OrganizationRoleCreateSheet}), edit a custom role's permissions
 * ({@link OrganizationRolePermissionsSheet}), or delete a custom role
 * ({@link OrganizationRoleDeleteDialog}).
 *
 * `OrganizationTeamStore` is component-scoped and asks only for roles and
 * the permission catalog (`includeMembers`/`includeInvitations: false`) —
 * this page owns roles and permissions only, not membership. The store's
 * `mutationCallState` is shared across every write it exposes, so this page
 * tracks which surface is currently attributed it ({@link PendingMutation})
 * to close the right dialog on success and show an error only where it
 * belongs, rather than trusting a bare "last call failed" signal.
 *
 * Its title lives in the shell's own `DashboardPageHeader`; this page
 * renders no title band of its own. `app-organization-page-header` is
 * retired — the org identity it used to carry stays local to the dashboard
 * page. "New role" registers on the shell header through
 * `PageActionsService`, gated by {@link active}: the host tabs component
 * keeps this page mounted (`hlmTabsContentLazy`) once its tab has activated
 * once, so leaving the tab does not destroy it and the plain
 * `registerPageActions` dance alone would leave a stale "New role" button
 * registered after switching to a sibling tab.
 *
 * @version 1.4.0
 *
 * @example
 * ```typescript
 * <app-organization-team-page [organizationId]="organizationId()" [active]="activeTab() === 'roles'" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    OrganizationRoleCreateSheet,
    OrganizationRoleDeleteDialog,
    OrganizationRoleGrid,
    OrganizationRolePermissionsSheet,
    StatTile,
    HlmButton,
  ],
  providers: [
    OrganizationTeamStore,
    provideIcons({ lucideCircleAlert, lucideKeyRound, lucidePlus, lucideShield, lucideShieldPlus }),
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

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether this page's tab is the one currently showing, defaulting to
   * `true` for a standalone mount. Drives whether {@link pageActions} owns
   * the shell header's action slot — see the class `@description`.
   *
   * @access public
   * @since 1.4.0
   * @type {InputSignal<boolean>}
   */
  public readonly active: InputSignal<boolean> = input<boolean>(true);

  /** Where a role card's member count links, so "who holds this role" has an answer. */
  protected readonly membersRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'members'],
  );
  //#endregion

  //#region Properties
  /** Roles and the permission catalog for the active organization. */
  protected readonly store: OrganizationTeamStoreType =
    inject<OrganizationTeamStoreType>(OrganizationTeamStore);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New role" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /** Whether the acting member may create, edit or delete a custom role. */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /** The organization's custom (non-system) roles, backing the "Custom roles" KPI tile. */
  protected readonly customRoles: Signal<readonly OrganizationRoleOutput[]> = computed(
    (): readonly OrganizationRoleOutput[] => this.store.roles().filter((role) => !role.isSystem),
  );

  /**
   * Property kpiTiles
   * @readonly
   *
   * @description
   * The KPI row's view-models: the total role count, the custom-role count,
   * and the permission catalog size — all already loaded by this page's own
   * `store.load()` call, so the row costs no extra request.
   *
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly OrganizationTeamKpiTile[]>}
   */
  protected readonly kpiTiles: Signal<readonly OrganizationTeamKpiTile[]> = computed(
    (): readonly OrganizationTeamKpiTile[] => {
      const loading: boolean = this.store.isLoading();

      return [
        {
          id: 'total',
          label: $localize`:@@org.team.kpiTotalRoles:Total roles`,
          value: this.store.roles().length,
          icon: 'lucideShield',
          loading,
        },
        {
          id: 'custom',
          label: $localize`:@@org.team.kpiCustomRoles:Custom roles`,
          value: this.customRoles().length,
          icon: 'lucideShieldPlus',
          loading,
        },
        {
          id: 'permissions',
          label: $localize`:@@org.team.kpiPermissionsCatalog:Permissions in catalog`,
          value: this.store.permissions().length,
          icon: 'lucideKeyRound',
          loading,
        },
      ];
    },
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
   * Loads this organization's roles and permission catalog once, closes
   * whichever of the create dialog or the delete confirmation is open once
   * its write settles successfully — the permission editor is deliberately
   * left open on success, an operator toggling several permissions in a row
   * should not have the panel close under them after the first one — and
   * registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const isActive: boolean = this.active();
      const template: TemplateRef<unknown> | undefined = this.pageActions();

      untracked((): void => {
        if (isActive && template) this.pageActionsService.register(template);
        else if (!isActive) this.pageActionsService.clear(template);
      });
    });

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
   * Method onDeleteDialogVisibleChange
   * @description Clears the pending role on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onDeleteDialogVisibleChange(visible: boolean): void {
    if (visible) return;

    this.pendingDeleteRole.set(null);
  }
  //#endregion
}
