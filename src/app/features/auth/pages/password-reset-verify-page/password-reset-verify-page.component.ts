import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/forms/otp-verification-form';
import { PasswordResetStore } from '@core/stores/password-reset';
import { ToastService } from '@core/services/toast';
import type { OperationError } from '@core/stores/operations';
import { PasswordResetRequestOutput, PasswordResetResendOutput } from '@app/core/models';

/**
 * Component PasswordResetVerifyPage
 * @class PasswordResetVerifyPage
 *
 * @description
 * Password reset verification page.
 * Displays OTP form to verify password reset code.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-password-reset-verify-page',
  imports: [OtpVerificationForm],
  templateUrl: './password-reset-verify-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetVerifyPage {
  //#region Properties
  /**
   * Property passwordResetStore
   * @readonly
   *
   * @description
   * Password reset store for verification.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PasswordResetStore}
   */
  private readonly passwordResetStore: PasswordResetStore =
    inject<PasswordResetStore>(PasswordResetStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular router for navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Input token
   * @input
   * @readonly
   *
   * @description
   * Challenge token from URL query param `token`.
   * Bound automatically by router via withComponentInputBinding().
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly token: InputSignal<string | undefined> =
    input<string | undefined>(undefined);

  /**
   * Property toastService
   * @readonly
   *
   * @description
   * Toast service for displaying API errors.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ToastService}
   */
  private readonly toastService: ToastService =
    inject<ToastService>(ToastService);

  /**
   * Property resendErrorEffectInitialized
   *
   * @description
   * Prevents showing stale error toast on first effect run.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private resendErrorEffectInitialized: boolean = false;

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * Whether verification is in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() =>
    this.passwordResetStore.isResending()
  );

  /**
   * Computed error
   * @readonly
   *
   * @description
   * Verification error if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OperationError<unknown> | null>}
   */
  protected readonly error: Signal<OperationError<unknown> | null> = computed(() =>
    this.passwordResetStore.resendError()
  );

  /**
   * Computed resendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly resendIn: Signal<number | null> = computed(() => {
    const currentRequest: PasswordResetRequestOutput | PasswordResetResendOutput | null = this.passwordResetStore.currentRequest();
    return currentRequest?.canResendIn ?? null;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Sets up navigation after successful verification.
   */
  public constructor() {
    // Load token from URL if not already loaded
    effect(() => {
      const token = this.token() ?? null;
      const currentToken = this.passwordResetStore.challengeToken();

      if (token && token !== currentToken) {
        this.passwordResetStore.setChallengeToken(token);
      }

      if (!token && !currentToken) {
        void this.router.navigate(['/auth/password-reset/forgot']);
      }
    });

    // Show password reset resend API errors as toast notifications
    effect(() => {
      const error = this.error();

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
   * Method handleVerify
   *
   * @description
   * Handles OTP verification.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpVerificationFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleVerify(values: OtpVerificationFormValues): void {
    this.passwordResetStore.setVerificationCode(values.code);
    void this.router.navigate(['/auth/password-reset/new']);
  }

  /**
   * Method handleCancel
   *
   * @description
   * Handles verification cancellation.
   * Navigates back to forgot password page and clears stored challenge token.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleCancel(): void {
    this.passwordResetStore.clear();
    void this.router.navigate(['/auth/password-reset/forgot']);
  }

  /**
   * Method handleResend
   *
   * @description
   * Handles code resend request.
   * Calls the store resend method to get a new challenge token.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleResend(): void {
    this.passwordResetStore.resend();
  }
  //#endregion
}
