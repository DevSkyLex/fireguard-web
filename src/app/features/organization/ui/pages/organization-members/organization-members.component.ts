import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  signal,
  type Signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { FeedbackService } from '@core/feedback';
import { errorFeedback, successFeedback } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_QUOTA_RESOURCE,
} from '@features/organization/models';
import type {
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import {
  MEMBERS_PAGE_SIZE,
  organizationMembersStoreEvents,
  OrganizationMembersStore,
} from '@features/organization/state/organization-members';
import { OrganizationQuotaUpgradeDialog } from '@features/organization/ui/components';
import {
  OrganizationInviteDrawer,
  OrganizationRoleAssignmentDrawer,
} from '@features/organization/ui/drawers';
import type { OrganizationRoleAssignmentValues } from '@features/organization/ui/forms';
import {
  OrganizationInvitationTable,
  OrganizationMemberTable,
  type OrganizationMemberBulkRoleAssignment,
  type OrganizationMemberRoleRemoval,
} from '@features/organization/ui/tables';
import { isQuotaExceededError } from '@features/organization/utils';

/**
 * Page OrganizationMembersPage
 *
 * @description
 * Dedicated members page: lists organization members and invitations with the
 * site design (avatars, role chips, status tags) and owns the member/invitation
 * actions (invite, add, assign role, resend, copy link, revoke). Role
 * definitions remain on the roles-only team page.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-members',
  imports: [
    ButtonModule,
    MessageModule,
    TabsModule,
    OrganizationInvitationTable,
    OrganizationMemberTable,
    OrganizationInviteDrawer,
    OrganizationRoleAssignmentDrawer,
    OrganizationQuotaUpgradeDialog,
  ],
  providers: [OrganizationMembersStore],
  templateUrl: './organization-members.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMembersPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** PrimeNG confirmation service for destructive member operations. */
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** App-wide feedback facade for transient toasts (copy link). */
  private readonly feedback: FeedbackService = inject(FeedbackService);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /** Root-provided quota store, reloaded after a member quota-exceeded failure. */
  private readonly quotaStore: OrganizationQuotaStore = inject(OrganizationQuotaStore);
  /** Page-scoped members workflow store. */
  protected readonly store: OrganizationMembersStore = inject(OrganizationMembersStore);

  /** Store event stream, used to close a drawer only once the server confirms. */
  private readonly events: Events = inject<Events>(Events);

  /** Server-side page size for the members table. */
  protected readonly membersPageSize: number = MEMBERS_PAGE_SIZE;
  /** Localized fallback for the load-error banner. */
  protected readonly loadErrorFallback: string = $localize`:@@org.members.loadError:The members could not be loaded.`;
  /** Localized fallback for the mutation-error banner. */
  protected readonly mutationErrorFallback: string = $localize`:@@org.members.mutationError:The operation could not be completed.`;

  /** Zero-based index of the active view tab (members / pending invitations). */
  protected readonly activeTab: WritableSignal<number> = signal(0);

  /** Visibility of the invite-member drawer. */
  protected readonly inviteDrawerVisible: WritableSignal<boolean> = signal(false);
  /** Visibility of the assign-role drawer. */
  protected readonly assignDrawerVisible: WritableSignal<boolean> = signal(false);

  /** Invitation id awaiting a copy once its fresh link is available. */
  private readonly copyTargetId: WritableSignal<string | null> = signal(null);

  /** The capped resource governing member additions and invitations. */
  protected readonly quotaResource = ORGANIZATION_QUOTA_RESOURCE.MEMBERS;
  /** Whether the organization has reached its plan limit for members. */
  protected readonly atMemberLimit: Signal<boolean> = computed<boolean>(() =>
    this.quotaStore.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.MEMBERS),
  );
  /** Visibility of the quota upgrade dialog shown on a 409 member failure. */
  protected readonly quotaDialogVisible: WritableSignal<boolean> = signal<boolean>(false);
  /** Whether the current mutation error is an inline-displayable (non-quota) error. */
  protected readonly hasInlineMutationError: Signal<boolean> = computed<boolean>(() => {
    const error = this.store.mutationError();
    return (
      error !== null && !(isQuotaExceededError(error) && this.store.lastMutationCanExceedQuota())
    );
  });

  /** Whether the active member can view the member workflow. */
  protected readonly canViewMembers: Signal<boolean> = computed(() =>
    this.permissionService.hasAnyPermission([
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
    ]),
  );
  /** Whether the active member can view roles. */
  protected readonly canViewRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasAnyPermission([
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ]),
  );
  /** Whether the active member can manage members and invitations. */
  protected readonly canManageMembers: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_MANAGE),
  );
  /** Whether the active member can manage organization roles. */
  protected readonly canManageRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /** Loads members and wires the quota-failure and copy-after-resend effects. */
  public constructor() {
    // An effect, not a direct call: the routed input is only bound after
    // construction, and reading it here would throw NG0950. Reloading is
    // untracked so the permission signals it reads cannot re-trigger it.
    effect((): void => {
      this.organizationId();

      untracked((): void => this.reload());
    });

    // Surface member quota (409) failures through the actionable upgrade dialog.
    // Only the invite mutation can hit the plan quota, so gate on that flag to
    // avoid misreading other 409s (e.g. the last-admin guard) as a quota error.
    effect(() => {
      const error = this.store.mutationError();
      if (
        error !== null &&
        isQuotaExceededError(error) &&
        this.store.lastMutationCanExceedQuota()
      ) {
        this.quotaStore.reload();
        this.quotaDialogVisible.set(true);
      }
    });

    // Copy the accept link once a resend has produced a fresh one.
    effect(() => {
      const id = this.copyTargetId();
      if (!id) return;
      const link = this.store.invitationLinks()[id];
      if (link) {
        this.writeClipboard(link);
        this.copyTargetId.set(null);
      }
    });

    // Close each drawer only once the server confirms. Closing on submit discarded
    // the member's input on any failure and left them nothing to correct.
    this.events
      .on(organizationMembersStoreEvents.inviteSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.inviteDrawerVisible.set(false));

    this.events
      .on(organizationMembersStoreEvents.assignRoleSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.assignDrawerVisible.set(false));
  }

  /** Reloads the member resources allowed by current permissions. */
  protected reload(): void {
    const organizationId: string = this.organizationId();
    this.store.load({
      organizationId,
      includeMembers: this.canViewMembers(),
      includeInvitations: this.canViewMembers(),
      includeRoles: this.canViewRoles(),
    });
  }

  /** Activates the requested view tab from the PrimeNG tabs value change. */
  protected onTabChange(value: string | number | undefined): void {
    this.activeTab.set(Number(value ?? 0));
  }

  /** Loads the requested members page, preserving the active search term. */
  protected onMembersPage(page: number): void {
    const organizationId: string = this.organizationId();
    this.store.loadMembers({ organizationId, page, search: this.store.membersSearch() });
  }

  /** Runs a server-side member search from the first page. */
  protected onMembersSearch(search: string): void {
    const organizationId: string = this.organizationId();
    this.store.loadMembers({ organizationId, page: 1, search });
  }

  /**
   * Sends an invitation. The drawer stays open until the server confirms.
   *
   * Closing here would discard what the member typed the moment anything failed —
   * a duplicate address, an exhausted seat quota — leaving them to retype it from
   * a toast. {@link inviteSucceeded} closes it instead.
   */
  protected invite(payload: InviteOrganizationMemberInput): void {
    const organizationId: string = this.organizationId();
    this.store.invite({ organizationId, input: payload });
  }

  /** Assigns a role to a member, then closes the assign drawer. */
  protected assignRole(values: OrganizationRoleAssignmentValues): void {
    const organizationId: string = this.organizationId();
    this.store.assignRole({
      organizationId,
      memberId: values.memberId,
      input: { roleId: values.roleId },
    });
  }

  /** Confirms and removes an assigned role from a member. */
  protected removeRoleFromMember(removal: OrganizationMemberRoleRemoval): void {
    const organizationId: string = this.organizationId();
    this.confirmationService.confirm({
      header: $localize`:@@org.members.removeRoleHeader:Remove role`,
      message: $localize`:@@org.members.removeRoleMessage:Remove this role from the member?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@org.members.remove:Remove`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () =>
        this.store.removeRoleFromMember({
          organizationId,
          memberId: removal.member.id,
          roleId: removal.roleId,
        }),
    });
  }

  /** Assigns one role to all selected members in one action. */
  protected bulkAssignRole(assignment: OrganizationMemberBulkRoleAssignment): void {
    const organizationId: string = this.organizationId();
    if (assignment.members.length === 0) return;
    this.store.assignRoleToMembers({
      organizationId,
      memberIds: assignment.members.map((member) => member.id),
      roleId: assignment.roleId,
    });
  }

  /** Confirms and removes the selected members in one action. */
  protected bulkRemoveMembers(members: readonly OrganizationMemberOutput[]): void {
    const organizationId: string = this.organizationId();
    if (members.length === 0) return;
    this.confirmationService.confirm({
      header: $localize`:@@org.members.bulkRemoveHeader:Remove members`,
      message: $localize`:@@org.members.bulkRemoveMessage:Remove the selected members from the organization?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@org.members.remove:Remove`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () =>
        this.store.removeMembers({
          organizationId,
          memberIds: members.map((member) => member.id),
        }),
    });
  }

  /** Confirms and removes a member from the active organization. */
  protected removeMember(member: OrganizationMemberOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@org.members.removeHeader:Remove member`,
      message: $localize`:@@org.members.removeMessage:Remove this member from the organization?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@org.members.remove:Remove`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        const organizationId: string = this.organizationId();
        this.store.removeMember({ organizationId, memberId: member.id });
      },
    });
  }

  /** Confirms and revokes a pending invitation. */
  protected revokeInvitation(invitation: OrganizationInvitationOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@org.members.revokeHeader:Revoke invitation`,
      message: $localize`:@@org.members.revokeMessage:Revoke the invitation sent to ${invitation.email}:email:?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@org.members.revoke:Revoke`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        const organizationId: string = this.organizationId();
        this.store.revokeInvitation({ organizationId, invitationId: invitation.id });
      },
    });
  }

  /** Resends an invitation (regenerating its token and accept link). */
  protected resendInvitation(invitation: OrganizationInvitationOutput): void {
    // A manual resend is not a copy request: drop any pending copy intent so a
    // prior failed copy-resend cannot hijack this one into a silent clipboard copy.
    this.copyTargetId.set(null);
    const organizationId: string = this.organizationId();
    this.store.resendInvitation({ organizationId, invitationId: invitation.id });
  }

  /**
   * Copies the invitation accept link. Uses the cached fresh link when
   * available; otherwise confirms first, since obtaining a link requires
   * regenerating the token (invalidating the previous link and re-sending the
   * invitation email).
   */
  protected copyLink(invitation: OrganizationInvitationOutput): void {
    const link = this.store.invitationLinks()[invitation.id];
    if (link) {
      this.writeClipboard(link);
      return;
    }
    const organizationId: string = this.organizationId();
    this.confirmationService.confirm({
      header: $localize`:@@org.members.copyRegenerateHeader:Generate a new link`,
      message: $localize`:@@org.members.copyRegenerateMessage:A new invitation link will be generated, the previous one will stop working, and the invitation email will be sent again. Continue?`,
      icon: 'pi pi-link',
      acceptButtonProps: { label: $localize`:@@org.members.copyRegenerateConfirm:Generate & copy` },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.copyTargetId.set(invitation.id);
        this.store.resendInvitation({ organizationId, invitationId: invitation.id });
      },
    });
  }

  /** Writes a value to the clipboard, confirming only once it succeeds. */
  private writeClipboard(value: string): void {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      this.notifyCopyFailed();
      return;
    }
    clipboard.writeText(value).then(
      () =>
        this.feedback.show(
          successFeedback(
            $localize`:@@org.members.linkCopiedDetail:The invitation link is on your clipboard.`,
            $localize`:@@org.members.linkCopiedSummary:Link copied`,
          ),
        ),
      () => this.notifyCopyFailed(),
    );
  }

  /** Shows an error toast when the invitation link could not be copied. */
  private notifyCopyFailed(): void {
    this.feedback.show(
      errorFeedback(
        $localize`:@@org.members.linkCopyErrorDetail:The link could not be copied. Please copy it manually.`,
        { summary: $localize`:@@org.members.linkCopyErrorSummary:Copy failed` },
      ),
    );
  }
}
