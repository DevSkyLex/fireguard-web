import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { OtpForm, type OtpFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';
import { PageHeading } from '@shared/page-heading';

/**
 * Component MfaVerifyPage
 * @class MfaVerifyPage
 *
 * @description
 * Route entry for the second factor. The challenge lives in `AuthStore`, put
 * there by the sign-in response, and `mfaGuard` guarantees one exists before
 * this page renders.
 *
 * A TOTP challenge hides the resend control: an authenticator code is generated
 * on the device, so there is no delivery to repeat, and the backend rejects the
 * resend outright (`FEATURE.md`, auth). The same absent destination also has no
 * "sent to" to name, so the template's projected lead falls back to a generic
 * sentence instead of an empty one.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mfa-verify-page',
  imports: [OtpForm, PageHeading],
  templateUrl: './mfa-verify-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaVerifyPage {
  //#region Properties
  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Owns the challenge, the verification request and the resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  protected readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to leave once the session is established.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Carries the `returnUrl` preserved across the sign-in redirect.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property canResend
   * @readonly
   *
   * @description
   * Whether a new code can be sent. False for an authenticator app.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canResend: Signal<boolean> = computed(
    (): boolean => this.authStore.mfaMethod() !== 'totp',
  );

  /**
   * Property destination
   * @readonly
   *
   * @description
   * Where the code was sent — a masked address or phone number — or `null` for
   * an authenticator app, which has no destination to name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly destination: Signal<string | null> = computed((): string | null =>
    this.authStore.mfaDestination(),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Leaves for the return URL once the second factor completes the session.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome = effect((): void => {
    if (!this.authStore.isAuthenticated()) return;

    untracked((): void => {
      void this.router.navigateByUrl(
        resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Submits the code together with the pre-auth token the sign-in response
   * left in the store. A missing token means the challenge expired, and the
   * guard sends the visitor back to sign-in on the next navigation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpFormValues} values - The entered code.
   *
   * @returns {void}
   */
  protected verify(values: OtpFormValues): void {
    const preAuthToken: string | null = this.authStore.mfaToken();
    if (preAuthToken === null) return;

    this.authStore.mfaVerify({ preAuthToken, code: values.code });
  }

  /**
   * Method resend
   * @method resend
   *
   * @description
   * Asks for a new code. The store reads the pre-auth token itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected resend(): void {
    this.authStore.mfaResend();
  }
  //#endregion
}
