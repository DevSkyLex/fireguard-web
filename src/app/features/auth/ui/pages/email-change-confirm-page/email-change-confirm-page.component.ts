import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  type EffectRef,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { EmailChangeConfirmStore } from '@features/auth/state';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';

/**
 * Component EmailChangeConfirmPage
 * @class EmailChangeConfirmPage
 *
 * @description
 * Public landing page of the email change confirmation link
 * (`/auth/email-change/confirm?token=…`). The token is deliberately NOT
 * consumed on arrival: mail clients and browsers prefetch links, and the
 * token is single-use — an automatic POST would burn it before the person
 * ever saw the page (the backend documents this risk). The change happens
 * only when the visitor activates the confirm button.
 *
 * On success the backend has revoked every session and OAuth token, so this
 * page performs the logout flow's local half — `AUTH_SESSION_PORT.clearSession()`,
 * the same purge account deactivation uses — and offers the sign-in link:
 * the user reconnects with the NEW address. On failure it shows the
 * backend's neutral message (invalid, expired and reused tokens all read the
 * same) and points back to the account security page to request a new
 * change.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-email-change-confirm-page',
  imports: [HlmButton, PageHeading, RouterLink],
  providers: [EmailChangeConfirmStore],
  templateUrl: './email-change-confirm-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailChangeConfirmPage {
  //#region Properties
  /**
   * Property confirmStore
   * @readonly
   *
   * @description
   * Page-scoped confirmation workflow: one call, one outcome.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EmailChangeConfirmStore}
   */
  protected readonly confirmStore: EmailChangeConfirmStore =
    inject<EmailChangeConfirmStore>(EmailChangeConfirmStore);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Carries the emailed token as a query parameter.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property authSession
   * @readonly
   *
   * @description
   * Auth session surface. `clearSession()` is the same local purge the 401
   * path and account deactivation use — required here because a successful
   * confirmation revoked every server-side session, so whatever token this
   * browser still holds is dead.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthSessionPort}
   */
  private readonly authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

  /**
   * Property token
   * @readonly
   *
   * @description
   * The emailed confirmation token, read once from the URL. `null` when the
   * link was truncated — the page then renders its invalid state without
   * ever calling the API.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string | null}
   */
  protected readonly token: string | null = this.route.snapshot.queryParamMap.get('token');

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * The backend's neutral RFC 7807 detail for a rejected token, with a
   * localized fallback. Invalid, expired and reused tokens all answer the
   * same message on purpose.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly errorMessage: Signal<string | null> = computed((): string | null => {
    const error = this.confirmStore.confirmError();
    if (error === null) return null;

    return (
      error.message ??
      $localize`:@@auth.emailChangeConfirm.errorFallback:This confirmation link is invalid or has expired.`
    );
  });

  /**
   * Property previousConfirmStatus
   *
   * @description
   * The confirmation call state as of the last time
   * {@link purgeSessionOnSuccess} ran, so it can spot the transition into
   * success rather than the state of being in it.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private previousConfirmStatus: string = 'idle';

  /**
   * Property purgeSessionOnSuccess
   * @readonly
   *
   * @description
   * Once the confirmation succeeds, purges the local session: the backend
   * revoked every server-side session, and keeping a dead token would only
   * produce a confusing 401 on the next navigation. The page stays put — its
   * success state carries the sign-in link.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly purgeSessionOnSuccess: EffectRef = effect((): void => {
    const status: string = this.confirmStore.confirmCallState().status;
    const previous: string = this.previousConfirmStatus;
    this.previousConfirmStatus = status;

    if (previous === status || status !== 'success') return;

    untracked((): void => {
      this.authSession.clearSession();
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Consumes the token — only ever on an explicit click.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    if (this.token === null || this.token === '') return;

    this.confirmStore.confirm(this.token);
  }
  //#endregion
}
