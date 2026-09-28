import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  type EffectRef,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucideTag,
} from '@ng-icons/lucide';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth';
import { OrganizationInvitationAcceptStore } from '@features/organization/state/organization-invitation-accept';
import { OrganizationAvatar } from '@features/organization/ui/components';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS } from '@features/organization/ui/tables/organization-invitation-table/constants/organization-invitation-status-tag-severity.constants';
import { resolveOrganizationInvitationStatusTag } from '@features/organization/ui/tables/organization-invitation-table/models';
import { getOrganizationInitials } from '@features/organization/utils';
import { PageHeading } from '@shared/page-heading';
import { formatRelativeDays } from '@shared/relative-time';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component OrganizationInvitationAcceptPage
 * @class OrganizationInvitationAcceptPage
 *
 * @description
 * Public landing page for an invitation `acceptUrl`. The preview loads for
 * anyone holding the token, signed in or not; accepting is the one action
 * that requires a session, so an unauthenticated attempt is redirected to
 * sign-in with this page's own URL (token included) as `returnUrl`.
 *
 * Presented as an open, centered surface inside FocusedLayout. Status states
 * share one local template, while actions retain equal full-width sizing.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-accept-page',
  host: { class: 'block w-full max-w-xl' },
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    PageHeading,
    OrganizationAvatar,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    HlmSpinner,
    ...HlmAlertImports,
  ],
  providers: [
    OrganizationInvitationAcceptStore,
    provideIcons({ lucideBan, lucideCircleAlert, lucideCircleCheck, lucideClock, lucideTag }),
  ],
  templateUrl: './organization-invitation-accept-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationAcceptPage {
  //#region Inputs
  /**
   * Property token
   * @readonly
   *
   * @description
   * The invitation token, bound from the `?token=` query parameter carried by
   * the backend `acceptUrl`. `undefined` when the link was reached without one.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly token: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   * @description The application's active locale, read directly since the invitee holds no organization context yet (§ DESIGN.md date rules, pages outside an organization).
   * @access private
   * @since 1.4.0
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped workflow store loading the public preview and accepting the
   * invitation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationInvitationAcceptStore}
   */
  protected readonly store: OrganizationInvitationAcceptStore =
    inject<OrganizationInvitationAcceptStore>(OrganizationInvitationAcceptStore);

  /**
   * Property authSession
   * @readonly
   *
   * @description
   * Read-only session contract used to gate the accept action without this
   * feature depending on auth internals.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthSessionPort}
   */
  private readonly authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to send an unauthenticated visitor to sign-in with this page's own
   * URL preserved as `returnUrl`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizationInitials
   * @readonly
   *
   * @description
   * Avatar fallback resolver, reused as-is from the organization feature so
   * the invited organization's monogram matches every other avatar in the app.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {(name: string) => string}
   */
  protected readonly organizationInitials: (name: string) => string = getOrganizationInitials;

  /**
   * Property invitationStatusTag
   * @readonly
   *
   * @description
   * Status presentation resolver, reused from the invitation table's
   * `<concept>-tag/` registry so the badge's label/icon/severity pairing
   * stays structural (§10.10) instead of a template `@switch`. Imported from
   * the table's private path until the registry is lifted to the feature's
   * `models/` — deferred while that table is concurrent work in progress.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {typeof resolveOrganizationInvitationStatusTag}
   */
  protected readonly invitationStatusTag: typeof resolveOrganizationInvitationStatusTag =
    resolveOrganizationInvitationStatusTag;

  /**
   * Property statusTagIconClass
   * @readonly
   *
   * @description
   * The severity → icon colour classes shared with the invitation table, so
   * both surfaces tint the same status the same way.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {typeof ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS}
   */
  protected readonly statusTagIconClass: typeof ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS =
    ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS;

  /**
   * Property missingTokenTitle
   * @readonly
   * @description Heading for the shared status card when the link carries no token.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly missingTokenTitle: string = $localize`:@@org.invitationAccept.missingTokenTitle:Invalid invitation link`;

  /**
   * Property missingTokenDescription
   * @readonly
   * @description Body for the shared status card when the link carries no token.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly missingTokenDescription: string = $localize`:@@org.invitationAccept.missingToken:This invitation link is missing its token.`;

  /**
   * Property previewErrorTitle
   * @readonly
   * @description Heading for the shared status card when the preview request failed.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly previewErrorTitle: string = $localize`:@@org.invitationAccept.previewErrorTitle:We can't open this invitation`;

  /**
   * Property previewErrorDescription
   * @readonly
   * @description Body for the shared status card when the preview request failed.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly previewErrorDescription: string = $localize`:@@org.invitationAccept.previewError:This invitation link is invalid, expired or has already been used.`;

  /**
   * Property notAvailableTitle
   * @readonly
   * @description Heading for the shared status card when a resolved invitation can no longer be acted on.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly notAvailableTitle: string = $localize`:@@org.invitationAccept.notAvailableTitle:This invitation isn't available`;

  /**
   * Property notAcceptableDescription
   * @readonly
   * @description Body for the shared status card when a resolved invitation can no longer be acted on.
   * @access protected
   * @since 1.2.0
   * @type {string}
   */
  protected readonly notAcceptableDescription: string = $localize`:@@org.invitationAccept.notAcceptable:This invitation can no longer be accepted.`;

  /**
   * Property expiresRelativeSuffix
   * @readonly
   * @description A pending invitation's `expiresAt`, as a localized whole-day relative label ("in 3 days"), counted from today in the device's local timezone — this page has no organization timezone to read yet. `null` before a preview loads.
   * @access protected
   * @since 1.4.0
   * @type {Signal<string | null>}
   */
  protected readonly expiresRelativeSuffix: Signal<string | null> = computed((): string | null => {
    const expiresAt: string | undefined = this.store.preview()?.expiresAt;

    return expiresAt
      ? formatRelativeDays(
          this.localCalendarDayOf(new Date(expiresAt)),
          this.localCalendarDayOf(new Date()),
          this.locale,
        )
      : null;
  });

  /**
   * Property isExpiringSoon
   * @readonly
   * @description Whether a pending invitation expires within 48 hours, so the urgency cue only appears when accepting soon actually matters.
   * @access protected
   * @since 1.4.0
   * @type {Signal<boolean>}
   */
  protected readonly isExpiringSoon: Signal<boolean> = computed((): boolean => {
    const expiresAt: string | undefined = this.store.preview()?.expiresAt;
    if (!expiresAt) return false;
    const remainingMs: number = new Date(expiresAt).getTime() - Date.now();
    return remainingMs > 0 && remainingMs <= 48 * 60 * 60 * 1000;
  });
  //#endregion

  //#region Lifecycle
  /**
   * Property loadPreviewOnTokenChange
   * @readonly
   *
   * @description
   * Requests the public preview whenever a token is present. A missing token
   * is left to the template's own "invalid link" state rather than firing a
   * doomed request.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EffectRef}
   */
  private readonly loadPreviewOnTokenChange: EffectRef = effect((): void => {
    const token: string | undefined = this.token();

    if (token === undefined) return;

    this.store.loadPreview(token);
  });

  /**
   * Property openAcceptedOrganization
   * @readonly
   * @description Opens the organization returned by acceptance; activation guards remain authoritative.
   * @access private
   * @since 1.0.0
   * @type {EffectRef}
   */
  private readonly openAcceptedOrganization: EffectRef = effect((): void => {
    if (!this.store.isAccepted()) return;
    const organizationId: string | null = this.store.acceptedOrganizationId();
    void this.router.navigate(
      organizationId ? ['/organizations', organizationId] : ['/organizations'],
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method accept
   * @method accept
   *
   * @description
   * Accepts the invitation for a signed-in visitor, or redirects to sign-in
   * with `returnUrl` set to this page's own address so the flow resumes here
   * once authenticated.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected accept(): void {
    const token: string | undefined = this.token();

    if (token === undefined) return;

    if (!this.authSession.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });

      return;
    }

    this.store.accept(token);
  }

  /**
   * Method localCalendarDayOf
   * @description The `YYYY-MM-DD` calendar day an instant falls on in the device's local timezone, read from `Intl.DateTimeFormat` rather than through string slicing so it stays correct across DST.
   * @access private
   * @since 1.4.0
   * @param {Date} instant - The instant to resolve.
   * @returns {string} The local calendar day.
   */
  private localCalendarDayOf(instant: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  }
  //#endregion
}
