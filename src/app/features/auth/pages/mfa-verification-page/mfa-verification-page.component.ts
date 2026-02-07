import { Component, ChangeDetectionStrategy, inject, effect, computed, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/forms/otp-verification-form';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';
import { TrustedDeviceStore } from '@core/stores/trusted-device';
import { MessageService } from 'primeng/api';
import type { OperationStatus } from '@core/stores/operations';

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
  private readonly messageService: MessageService = inject(MessageService);
  private previousMfaVerifyStatus: OperationStatus = 'idle';
  private previousMfaResendStatus: OperationStatus = 'idle';

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
    // Navigate to home when authenticated
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.userStore.load();
        void this.router.navigate(['/home']);
      }
    });

    // Show MFA verification API errors as toast notifications
    effect(() => {
      const operation = this.authStore.mfaVerifyOperation();
      const currentStatus = operation.status;

      if (currentStatus === 'error' && this.previousMfaVerifyStatus === 'loading') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: operation.error?.message ?? 'Failed to verify code',
          life: 5000,
        });
      }

      this.previousMfaVerifyStatus = currentStatus;
    });

    // Show MFA resend API errors as toast notifications
    effect(() => {
      const operation = this.authStore.mfaResendOperation();
      const currentStatus = operation.status;

      if (currentStatus === 'error' && this.previousMfaResendStatus === 'loading') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: operation.error?.message ?? 'Failed to resend code',
          life: 5000,
        });
      }

      this.previousMfaResendStatus = currentStatus;
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
