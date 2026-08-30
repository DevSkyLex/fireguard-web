import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
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
  lucideLink2Off,
  lucideMailX,
  lucideTag,
} from '@ng-icons/lucide';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { OrganizationInvitationAcceptStore } from '@features/organization/state/organization-invitation-accept';
import { OrganizationAvatar } from '@features/organization/ui/components';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS } from '@features/organization/ui/tables/organization-invitation-table/constants/organization-invitation-status-tag-severity.constants';
import { resolveOrganizationInvitationStatusTag } from '@features/organization/ui/tables/organization-invitation-table/models';
import { getOrganizationInitials } from '@features/organization/utils';
import { PageHeading } from '@shared/page-heading';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
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
 * This is a route shell — orchestration and the request states — presented
 * as a single centered card inside `FocusedLayout`. The missing-token,
 * preview-error and not-available states share one `#statusCard` template
 * (icon-or-avatar, title, optional badge, description, a "Go to homepage"
 * footer identical across the three) rather than three near-duplicate
 * `hlmCard` blocks — a local `ng-template`, not a new component, since every
 * consumer lives on this one page (`ARCHITECTURE.md` §2.8) and the codebase
 * already uses this exact shape for a repeated, parameterized row
 * (`ChannelsPage`'s `#row`, `StatTile`'s `#tileContent`). The icon area shows
 * the chip for a state that has no organization to name (missing token,
 * preview error) and the organization's own avatar for a state that does
 * (accepted, pending, not-available).
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-accept-page',
  imports: [
    OrgDatePipe,
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
    ...HlmCardImports,
  ],
  providers: [
    OrganizationInvitationAcceptStore,
    provideIcons({
      lucideBan,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideClock,
      lucideLink2Off,
      lucideMailX,
      lucideTag,
    }),
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
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

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
  //#endregion
}
