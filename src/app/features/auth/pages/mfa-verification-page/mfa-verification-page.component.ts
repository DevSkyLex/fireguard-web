import { Component, ChangeDetectionStrategy, inject, effect, computed, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/forms/otp-verification-form';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import { TrustedDeviceStore } from '@core/stores/trusted-device';
import { ToastService } from '@core/services/toast';
import type { OperationError } from '@core/stores/operations';

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
 * 5. Verification successful → Navigate to /home
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
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly trustedDeviceStore: TrustedDeviceStore = inject(TrustedDeviceStore);
  private readonly userStore: UserStore = inject(UserStore);
  private readonly router: Router = inject(Router);
  private readonly toastService: ToastService = inject(ToastService);
  private verifyErrorEffectInitialized: boolean = false;
  private resendErrorEffectInitialized: boolean = false;

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
  protected readonly loading: Signal<boolean> = computed(() =>
    this.authStore.isVerifyingMfa()
  );

  /**
   * Computed error
   * @readonly
   *
   * @description
   * MFA verification error state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OperationError<unknown> | null>}
   */
  protected readonly error: Signal<OperationError<unknown> | null> = computed(() =>
    this.authStore.mfaVerifyError()
  );

  /**
   * Computed resendError
   * @readonly
   *
   * @description
   * MFA resend error state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OperationError<unknown> | null>}
   */
  protected readonly resendError: Signal<OperationError<unknown> | null> = computed(() =>
    this.authStore.mfaResendError()
  );

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
    const loginOp = this.authStore.loginOperation();
    return loginOp.data?.mfa_resend_in ?? null;
  });
  //#endregion

  //#region Constructor
  public constructor() {
    // Redirect if MFA not required
    effect(() => {
      if (!this.authStore.mfaRequired()) {
        void this.router.navigate(['/auth/login']);
      }
    });

    // Navigate to home when authenticated
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.userStore.load();
        void this.router.navigate(['/home']);
      }
    });

    // Show MFA verification API errors as toast notifications
    effect(() => {
      const error = this.error();

      if (!this.verifyErrorEffectInitialized) {
        this.verifyErrorEffectInitialized = true;
        return;
      }

      if (error) {
        this.toastService.error(error.message ?? 'Failed to verify code');
      }
    });

    // Show MFA resend API errors as toast notifications
    effect(() => {
      const error = this.resendError();

      if (!this.resendErrorEffectInitialized) {
        this.resendErrorEffectInitialized = true;
        return;
      }

      if (error) {
        this.toastService.error(error.message ?? 'Failed to resend code');
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
    const mfaToken = this.authStore.mfaToken();
    if (!mfaToken) return;

    // Set pending trust device if user checked the option
    if (values.trustDevice) {
      this.trustedDeviceStore.setPendingTrustDevice(true);
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
   * @returns {void}
   */
  protected handleOtpCancel(): void {
    this.authStore.clearMfaState();
    void this.router.navigate(['/auth/login']);
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
