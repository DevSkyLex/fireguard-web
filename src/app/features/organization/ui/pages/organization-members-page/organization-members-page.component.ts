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
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideMailPlus,
  lucideMailQuestion,
  lucideTrash2,
  lucideUsersRound,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { CallState, CallStatus, StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type InviteOrganizationMemberInput,
  type OrganizationInvitationOutput,
  type OrganizationMemberOutput,
} from '@features/organization/models';
import {
  MEMBERS_PAGE_SIZE,
  OrganizationMembersStore,
} from '@features/organization/state/organization-members';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmLabel } from '@shared/ui/label';
import { OrganizationInviteDialog } from '../../dialogs/organization-invite-dialog';
import {
  OrganizationMemberRolesDialog,
  type OrganizationMemberRoleToggle,
} from '../../dialogs/organization-member-roles-dialog';
import { OrganizationInvitationTable } from '../../tables/organization-invitation-table';
import { OrganizationMemberTable } from '../../tables/organization-member-table';

/**
 * Component OrganizationMembersPage
 * @class OrganizationMembersPage
 *
 * @description
 * Route entry page for `/organizations/:organizationId/members`: two
 * stacked sections built like this codebase's other permission-aware list
 * pages (`InterventionsPage`) — the members grid with bulk selection and a
 * confirm-gated remove, and the pending-invitations grid underneath, both
 * fed by one component-scoped `OrganizationMembersStore`.
 *
 * It owns what its tables must not — which resources load
 * (`OrganizationMembersLoadOptions` is built from four independent backend
 * permissions: `organization.members.read` for the roster,
 * `organization.members.manage` for invitations and their write actions,
 * `organization.roles.read` for the role catalog and `organization.roles.manage`
 * for role assignment — assigning a role is not gated by `members.manage`,
 * it is a distinct permission the backend checks on its own endpoint), the
 * members page window, the invite/role-assignment dialogs and the shared
 * remove-confirmation (`ARCHITECTURE.md` §10.5).
 *
 * The store exposes one shared `mutationCallState` across every write
 * action, so a stale error from an earlier action must never leak into a
 * dialog opened afterwards: {@link inviteSubmitted} scopes the invite
 * dialog's error banner to invites actually attempted in the current
 * dialog session, and the page-level banner clears itself the moment a new
 * error lands and hides while the invite dialog is showing its own copy.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-members-page',
  imports: [
    NgIcon,
    HlmButton,
    HlmLabel,
    OrganizationInvitationTable,
    OrganizationInviteDialog,
    OrganizationMemberRolesDialog,
    OrganizationMemberTable,
    ...HlmAlertDialogImports,
    ...HlmEmptyImports,
  ],
  providers: [
    OrganizationMembersStore,
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideCircleAlert,
      lucideMailPlus,
      lucideMailQuestion,
      lucideTrash2,
      lucideUsersRound,
      lucideX,
    }),
  ],
  templateUrl: './organization-members-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMembersPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose members are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The members/invitations workflow store, scoped to this page. */
  protected readonly store: OrganizationMembersStore =
    inject<OrganizationMembersStore>(OrganizationMembersStore);

  /** Organization permission checks gating every write action this page offers. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Currently selected member ids, scoped to the loaded page — cleared on every reload. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The members page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** Whether the invite dialog is open. */
  protected readonly inviteDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether an invite was actually submitted in the current dialog session — scopes the error banner. */
  protected readonly inviteSubmitted: WritableSignal<boolean> = signal<boolean>(false);

  /** The member id the role-assignment dialog is currently open for, or `null` when closed. */
  protected readonly rolesDialogMemberId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** The member a row's menu asked to remove, pending confirmation. */
  protected readonly pendingRemove: WritableSignal<OrganizationMemberOutput | null> =
    signal<OrganizationMemberOutput | null>(null);

  /** The selected ids the toolbar asked to bulk-remove, pending confirmation. */
  protected readonly pendingBulkRemoveIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** Whether the page-level action-error banner was dismissed for the error currently in state. */
  private readonly actionErrorDismissed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canReadMembers
   * @readonly
   * @description Whether the roster may be loaded and shown at all (`organization.members.read`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadMembers: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ),
  );

  /**
   * Property canManageMembers
   * @readonly
   * @description Whether invitations, invite/resend/revoke and member removal may render (`organization.members.manage`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canManageMembers: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_MANAGE),
  );

  /**
   * Property canReadRoles
   * @readonly
   * @description Whether the role catalog may be loaded (`organization.roles.read`), needed for the role badges' source data and the assignment dialog.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadRoles: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_READ),
  );

  /**
   * Property canManageRoles
   * @readonly
   * @description Whether role assignment may render at all (`organization.roles.manage` — distinct from `members.manage`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canManageRoles: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /**
   * Property membersPageCount
   * @readonly
   * @description How many member pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly membersPageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.membersTotal() / MEMBERS_PAGE_SIZE)),
  );

  /** Where a member row's link points. */
  protected readonly memberDetailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'members'],
  );

  /** The header's count line, naming how many members the organization has. */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.store.membersTotal();

    return total === 1
      ? $localize`:@@org.members.countOne:1 member`
      : $localize`:@@org.members.countMany:${total}:count: members`;
  });

  /** Fallback text for the action-error banner when the backend sent no message. */
  protected readonly actionErrorFallback: string = $localize`:@@org.members.actionErrorFallback:The action could not be completed.`;

  /** The bulk-remove button's label, counting the current selection. */
  protected readonly bulkRemoveLabel: Signal<string> = computed<string>(
    () => $localize`:@@org.members.bulkRemoveButton:Remove (${this.selectedIds().size}:count:)`,
  );

  /** The member the role-assignment dialog is open for, resolved reactively so a toggle's own result is reflected immediately. */
  protected readonly rolesDialogMember: Signal<OrganizationMemberOutput | null> = computed(() => {
    const id: string | null = this.rolesDialogMemberId();

    return id === null ? null : (this.store.memberEntityMap()[id] ?? null);
  });

  /** The invite dialog's error banner, scoped to an invite actually attempted this session. */
  protected readonly inviteServerError: Signal<StoreError | null> = computed<StoreError | null>(
    () => (this.inviteSubmitted() ? this.store.mutationError() : null),
  );

  /**
   * Property actionError
   * @readonly
   * @description A non-invite mutation's error (remove, resend, revoke, role toggle), shown as a page-level banner and hidden while the invite dialog is showing its own copy.
   * @access protected
   * @since 1.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly actionError: Signal<StoreError | null> = computed<StoreError | null>(() => {
    if (this.actionErrorDismissed() || this.inviteDialogVisible()) return null;

    const state: CallState<null, StoreError> = this.store.mutationCallState();

    return state.status === 'error' ? state.error : null;
  });

  /** The remove-confirm dialog's open/closed state, derived from whichever pending target is set. */
  protected readonly removeDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingRemove() !== null || this.pendingBulkRemoveIds() !== null ? 'open' : 'closed',
  );

  /** The remove-confirm dialog's title, naming the count for a bulk removal. */
  protected readonly removeDialogTitle: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkRemoveIds();

    if (bulkIds && bulkIds.length > 1) {
      return $localize`:@@org.members.removeConfirmTitleMany:Remove ${bulkIds.length}:count: members?`;
    }

    return $localize`:@@org.members.removeConfirmTitleOne:Remove member?`;
  });

  /** The remove-confirm dialog's body: names the member for a single row, counts them for a bulk selection. */
  protected readonly removeDialogDescription: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkRemoveIds();

    if (bulkIds) {
      return bulkIds.length > 1
        ? $localize`:@@org.members.removeConfirmDescriptionMany:This will remove ${bulkIds.length}:count: members from the organization. This action cannot be undone.`
        : $localize`:@@org.members.removeConfirmDescriptionOne:This will remove this member from the organization. This action cannot be undone.`;
    }

    const single: OrganizationMemberOutput | null = this.pendingRemove();

    return single
      ? $localize`:@@org.members.removeConfirmDescriptionSingle:This will remove "${single.email ?? single.displayName ?? single.id}:name:" from the organization. This action cannot be undone.`
      : '';
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Wires the resource load (re-firing whenever the organization or the resolved permissions change) and the page-level error banner's auto-reset.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const includeMembers: boolean = this.canReadMembers();
      const includeInvitations: boolean = this.canManageMembers();
      const includeRoles: boolean = this.canReadRoles();

      untracked((): void => {
        this.page.set(1);
        this.selectedIds.set(new Set<string>());
        this.store.load({ organizationId, includeMembers, includeInvitations, includeRoles });
      });
    });

    effect((): void => {
      const status: CallStatus = this.store.mutationCallState().status;

      untracked((): void => {
        if (status === 'error') this.actionErrorDismissed.set(false);
      });
    });

    effect((): void => {
      const submitted: boolean = this.inviteSubmitted();
      const status: CallStatus = this.store.mutationCallState().status;

      untracked((): void => {
        if (submitted && status === 'success') {
          this.inviteDialogVisible.set(false);
          this.inviteSubmitted.set(false);
        }
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-runs the initial load after a failure.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      includeMembers: this.canReadMembers(),
      includeInvitations: this.canManageMembers(),
      includeRoles: this.canReadRoles(),
    });
  }

  /**
   * Method goToMembersPage
   * @description Loads another members page, leaving invitations and roles untouched.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested one-based page.
   * @returns {void}
   */
  protected goToMembersPage(target: number): void {
    const clamped: number = Math.min(Math.max(1, target), this.membersPageCount());

    this.page.set(clamped);
    this.selectedIds.set(new Set<string>());
    this.store.loadMembers({ organizationId: this.organizationId(), page: clamped, search: '' });
  }

  /**
   * Method onSelectionChanged
   * @description Records the members table's next row selection.
   * @access protected
   * @since 1.0.0
   * @param {ReadonlySet<string>} ids - The full next selection.
   * @returns {void}
   */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /**
   * Method openInviteDialog
   * @description Opens the invite dialog for a fresh session.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openInviteDialog(): void {
    this.inviteSubmitted.set(false);
    this.inviteDialogVisible.set(true);
  }

  /**
   * Method onInviteDialogVisibleChange
   * @description Keeps the dialog's error scope in sync with whether it is actually open.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onInviteDialogVisibleChange(visible: boolean): void {
    this.inviteDialogVisible.set(visible);
    if (!visible) this.inviteSubmitted.set(false);
  }

  /**
   * Method sendInvite
   * @description Hands the form's values to the store. The dialog closes itself once the shared mutation state reports success.
   * @access protected
   * @since 1.0.0
   * @param {InviteOrganizationMemberInput} payload - The validated invite payload.
   * @returns {void}
   */
  protected sendInvite(payload: InviteOrganizationMemberInput): void {
    this.inviteSubmitted.set(true);
    this.store.invite({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method openRolesDialog
   * @description Opens the role-assignment dialog for a member.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {void}
   */
  protected openRolesDialog(member: OrganizationMemberOutput): void {
    this.rolesDialogMemberId.set(member.id);
  }

  /**
   * Method onRolesDialogVisibleChange
   * @description Closes the role-assignment dialog.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onRolesDialogVisibleChange(visible: boolean): void {
    if (!visible) this.rolesDialogMemberId.set(null);
  }

  /**
   * Method onRoleToggled
   * @description Assigns or removes the toggled role for the dialog's current member.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberRoleToggle} toggle - Which role, and the requested next state.
   * @returns {void}
   */
  protected onRoleToggled(toggle: OrganizationMemberRoleToggle): void {
    const memberId: string | null = this.rolesDialogMemberId();
    if (memberId === null) return;

    if (toggle.assign) {
      this.store.assignRole({
        organizationId: this.organizationId(),
        memberId,
        input: { roleId: toggle.roleId },
      });
    } else {
      this.store.removeRoleFromMember({
        organizationId: this.organizationId(),
        memberId,
        roleId: toggle.roleId,
      });
    }
  }

  /**
   * Method requestRemove
   * @description Opens the confirm dialog for a single row's Remove entry.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {void}
   */
  protected requestRemove(member: OrganizationMemberOutput): void {
    this.pendingRemove.set(member);
  }

  /**
   * Method requestBulkRemove
   * @description Opens the confirm dialog for the current selection. A no-op when nothing is selected.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected requestBulkRemove(): void {
    const ids: ReadonlyArray<string> = [...this.selectedIds()];

    if (ids.length === 0) return;

    this.pendingBulkRemoveIds.set(ids);
  }

  /**
   * Method confirmRemove
   * @description Sends the pending target(s) to the store and closes the dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmRemove(): void {
    const single: OrganizationMemberOutput | null = this.pendingRemove();
    if (single) {
      this.store.removeMember({ organizationId: this.organizationId(), memberId: single.id });
    }

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkRemoveIds();
    if (bulkIds) {
      this.store.removeMembers({ organizationId: this.organizationId(), memberIds: bulkIds });
      this.selectedIds.set(new Set<string>());
    }

    this.pendingRemove.set(null);
    this.pendingBulkRemoveIds.set(null);
  }

  /**
   * Method onRemoveDialogStateChanged
   * @description Clears both pending-remove signals on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onRemoveDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingRemove.set(null);
    this.pendingBulkRemoveIds.set(null);
  }

  /**
   * Method copyInvitationLink
   * @description Puts an invitation's accept link on the clipboard.
   * @access protected
   * @since 1.0.0
   * @param {string} link - The accept link.
   * @returns {void}
   */
  protected copyInvitationLink(link: string): void {
    void navigator.clipboard?.writeText(link);
  }

  /**
   * Method resendInvitation
   * @description Resends an invitation, regenerating its accept link.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationInvitationOutput} invitation - The row's invitation.
   * @returns {void}
   */
  protected resendInvitation(invitation: OrganizationInvitationOutput): void {
    this.store.resendInvitation({
      organizationId: this.organizationId(),
      invitationId: invitation.id,
    });
  }

  /**
   * Method revokeInvitation
   * @description Revokes a pending invitation.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationInvitationOutput} invitation - The row's invitation.
   * @returns {void}
   */
  protected revokeInvitation(invitation: OrganizationInvitationOutput): void {
    this.store.revokeInvitation({
      organizationId: this.organizationId(),
      invitationId: invitation.id,
    });
  }

  /**
   * Method dismissActionError
   * @description Hides the page-level action-error banner until the next error.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected dismissActionError(): void {
    this.actionErrorDismissed.set(true);
  }
  //#endregion
}
