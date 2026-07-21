import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { FeedbackService } from '@core/feedback';
import { errorFeedback, successFeedback } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type {
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationMembersStore } from '@features/organization/state/organization-members';
import { OrganizationInviteDrawer } from '@features/organization/ui/drawers';
import { OrganizationInvitationTable } from '@features/organization/ui/tables';

/**
 * Component OrganizationSettingsInvitationsPage
 * @class OrganizationSettingsInvitationsPage
 *
 * @description
 * Dedicated settings tab for pending invitations: renders the shared
 * invitation table and owns its full lifecycle (invite, resend, copy link,
 * revoke) through the same page-scoped members workflow store the members page
 * uses.
 *
 * Inviting lives here as well as on the members page: this tab is where a
 * reader goes to manage invitations, and one that could revoke and resend but
 * not create was a dead end. The two entry points share the same drawer and
 * the same store method — they are one workflow reached from two contexts, not
 * two implementations.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-invitations',
  imports: [ButtonModule, MessageModule, OrganizationInvitationTable, OrganizationInviteDrawer],
  providers: [OrganizationMembersStore],
  templateUrl: './organization-settings-invitations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsInvitationsPage {
  //#region Properties
  /**
   * Property confirmationService
   * @readonly
   *
   * @description
   * PrimeNG confirmation service for destructive invitation operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * App-wide feedback facade for transient toasts (copy link).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property permissionService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped members workflow store, reused for its invitation collection
   * and mutations; members themselves are never loaded here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationMembersStore}
   */
  protected readonly store: OrganizationMembersStore =
    inject<OrganizationMembersStore>(OrganizationMembersStore);

  /**
   * Property inviteDrawerVisible
   *
   * @description
   * Whether the invite drawer is open.
   *
   * This tab could revoke, resend and copy an invitation but not create one —
   * a page for managing invitations with no way to make one is a dead end, and
   * the only entry point sat on the Members tab.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly inviteDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property loadErrorFallback
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly loadErrorFallback: string = $localize`:@@org.settings.invitationsLoadError:The invitations could not be loaded.`;

  /**
   * Property mutationErrorFallback
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly mutationErrorFallback: string = $localize`:@@org.settings.invitationsMutationError:The operation could not be completed.`;

  /**
   * Property copyTargetId
   * @readonly
   *
   * @description
   * Invitation id awaiting a clipboard copy once its fresh accept link lands
   * in the store after a resend.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly copyTargetId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property canManageInvitations
   * @readonly
   *
   * @description
   * Whether the active member can manage invitations. The route guard already
   * requires MEMBERS_MANAGE; this keeps the table's action gating reactive to
   * permission changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageInvitations: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_MANAGE),
  );

  /**
   * Property canViewRoles
   * @readonly
   *
   * @description
   * Whether roles may be loaded to resolve role names in the table; without
   * the permission the table falls back to raw role identifiers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canViewRoles: Signal<boolean> = computed<boolean>(() =>
    this.permissionService.hasAnyPermission([
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ]),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the invitations and wires the copy-after-resend effect (a copy
   * request may need a token regeneration before a link exists to copy).
   *
   * @since 1.0.0
   */
  public constructor() {
    this.reload();

    effect(() => {
      const id: string | null = this.copyTargetId();
      if (!id) return;
      const link: string | undefined = this.store.invitationLinks()[id];
      if (link) {
        this.writeClipboard(link);
        this.copyTargetId.set(null);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   *
   * @description
   * Loads the invitations (and roles when readable) for the active
   * organization. Members are deliberately excluded from this page's load.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    this.store.load({
      organizationId,
      includeMembers: false,
      includeInvitations: true,
      includeRoles: this.canViewRoles(),
    });
  }

  /**
   * Method revokeInvitation
   *
   * @description
   * Confirms and revokes a pending invitation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationInvitationOutput} invitation - The invitation to revoke.
   *
   * @returns {void}
   */
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
      accept: (): void => {
        const organizationId: string | undefined = this.organizationId();
        if (organizationId)
          this.store.revokeInvitation({ organizationId, invitationId: invitation.id });
      },
    });
  }

  /**
   * Method resendInvitation
   *
   * @description
   * Resends an invitation, regenerating its token and accept link. Drops any
   * pending copy intent so a prior failed copy-resend cannot hijack this one
   * into a silent clipboard copy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationInvitationOutput} invitation - The invitation to resend.
   *
   * @returns {void}
   */
  protected resendInvitation(invitation: OrganizationInvitationOutput): void {
    this.copyTargetId.set(null);
    const organizationId: string | undefined = this.organizationId();
    if (organizationId)
      this.store.resendInvitation({ organizationId, invitationId: invitation.id });
  }

  /**
   * Method copyLink
   *
   * @description
   * Copies the invitation accept link. Uses the cached fresh link when
   * available; otherwise confirms first, since obtaining a link requires
   * regenerating the token (invalidating the previous link and re-sending the
   * invitation email).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationInvitationOutput} invitation - The invitation whose link to copy.
   *
   * @returns {void}
   */
  protected copyLink(invitation: OrganizationInvitationOutput): void {
    const link: string | undefined = this.store.invitationLinks()[invitation.id];
    if (link) {
      this.writeClipboard(link);
      return;
    }

    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

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
      accept: (): void => {
        this.copyTargetId.set(invitation.id);
        this.store.resendInvitation({ organizationId, invitationId: invitation.id });
      },
    });
  }

  /**
   * Method writeClipboard
   *
   * @description
   * Writes a value to the clipboard, confirming only once it succeeds.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} value - The accept link to copy.
   *
   * @returns {void}
   */
  private writeClipboard(value: string): void {
    const clipboard: Clipboard | undefined =
      typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

    if (!clipboard) {
      this.notifyCopyFailed();
      return;
    }

    clipboard.writeText(value).then(
      (): void =>
        this.feedback.show(
          successFeedback(
            $localize`:@@org.members.linkCopiedDetail:The invitation link is on your clipboard.`,
            $localize`:@@org.members.linkCopiedSummary:Link copied`,
          ),
        ),
      (): void => this.notifyCopyFailed(),
    );
  }

  /**
   * Method notifyCopyFailed
   *
   * @description
   * Shows an error toast when the invitation link could not be copied.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private notifyCopyFailed(): void {
    this.feedback.show(
      errorFeedback(
        $localize`:@@org.members.linkCopyErrorDetail:The link could not be copied. Please copy it manually.`,
        { summary: $localize`:@@org.members.linkCopyErrorSummary:Copy failed` },
      ),
    );
  }

  /**
   * Method organizationId
   *
   * @description
   * Returns the active organization identifier when available.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {string | undefined} The active organization id.
   */
  private organizationId(): string | undefined {
    return this.activeOrganizationStore.selectedOrganization()?.id;
  }

  /**
   * Method invite
   *
   * @description
   * Sends an invitation, then closes the drawer.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InviteOrganizationMemberInput} input - Invitation to send.
   *
   * @returns {void}
   */
  protected invite(input: InviteOrganizationMemberInput): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    this.store.invite({ organizationId, input });
    this.inviteDrawerVisible.set(false);
  }
  //#endregion
}
