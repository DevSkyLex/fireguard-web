import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Component MfaVerificationPage
 * @class MfaVerificationPage
 *
 * @description
 * MFA (Multi-Factor Authentication) verification page.
 * Handles second factor authentication during login flow.
 *
 * **Usage:**
 * - User logs in with email/password
 * - If MFA is required → Navigate to /auth/mfa-verify
 * - Context stored in AuthStore (mfaToken, mfaRequired)
 * - Uses dedicated endpoint: POST /api/auth/mfa/verify
 *
 * **Flow:**
 * 1. User submits login credentials
 * 2. Backend returns 201 with mfaToken (MFA required)
 * 3. Frontend navigates to /auth/mfa-verify
 * 4. User enters OTP code
 * 5. Verification successful → Navigate to /
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mfa-verification-page',
  imports: [OtpVerificationForm],
  templateUrl: './mfa-verification-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaVerificationPage {
  //#region Properties
  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Authentication store for accessing MFA state
   * and performing verification.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  private readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property activeTrustedDeviceStore
   * @readonly
   *
   * @description
   * Root-level trusted-device store for handling "trust this device"
   * option during MFA.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveTrustedDeviceStore}
   */
  private readonly activeTrustedDeviceStore: ActiveTrustedDeviceStore =
    inject<ActiveTrustedDeviceStore>(ActiveTrustedDeviceStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular router for navigation after successful
   * MFA or cancellation.
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
   * Active route used to read the optional `returnUrl` query parameter
   * forwarded from the login step.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Computed showTrustDevice
   * @readonly
   *
   * @description
   * Always show trust device checkbox for MFA login.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showTrustDevice: Signal<boolean> = computed(() => true);

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * MFA verification loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() => this.authStore.isVerifyingMfa());

  /**
   * Computed resendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing MFA code resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly resendIn: Signal<number | null> = computed(() => {
    const loginOp = this.authStore.loginCallState();
    return loginOp.data?.mfa_resend_in ?? null;
  });

  /**
   * Computed mfaDestination
   * @readonly
   *
   * @description
   * Masked destination (or method label, e.g. "Authenticator App" for TOTP)
   * where the verification code can be found, as reported by the backend.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly mfaDestination: Signal<string | null> = computed(() =>
    this.authStore.mfaDestination(),
  );

  /**
   * Computed showResend
   * @readonly
   *
   * @description
   * Whether the resend affordance should be shown. TOTP codes are generated
   * locally by the authenticator app, so there is nothing to resend — the
   * backend rejects a resend attempt for a `totp` challenge with
   * `totp_not_resendable`.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showResend: Signal<boolean> = computed(
    () => this.authStore.mfaMethod() !== 'totp',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up navigation after successful MFA verification
   * and error handling for MFA failures.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    // Navigate to the returnUrl (or home) when authenticated
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(resolveReturnUrl(returnUrl)).catch(() => undefined);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleOtpSubmit
   *
   * @description
   * Handles MFA OTP form submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpVerificationFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleOtpSubmit(values: OtpVerificationFormValues): void {
    const mfaToken: string | null = this.authStore.mfaToken();
    if (!mfaToken) return;

    // Set pending trust device if user checked the option
    if (values.trustDevice) {
      this.activeTrustedDeviceStore.setPendingTrustDevice(true);
    }

    // Verify MFA code (AuthStore will handle trustDevice automatically on success)
    this.authStore.mfaVerify({
      preAuthToken: mfaToken,
      code: values.code,
    });
  }

  /**
   * Method handleOtpCancel
   *
   * @description
   * Handles MFA verification cancellation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {Promise<void>}
   */
  protected async handleOtpCancel(): Promise<void> {
    this.authStore.clearMfaState();
    await this.router.navigate(['/auth/login']).catch(() => undefined);
  }

  /**
   * Method handleOtpResend
   *
   * @description
   * Handles MFA code resend request.
   * Calls the store resend method to get new MFA and challenge tokens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleOtpResend(): void {
    this.authStore.mfaResend();
  }

  //#endregion
}
