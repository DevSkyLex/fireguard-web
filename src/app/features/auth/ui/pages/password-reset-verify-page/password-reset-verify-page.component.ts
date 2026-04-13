import { Component, ChangeDetectionStrategy, inject, computed, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import type { PasswordResetRequestOutput, PasswordResetResendOutput } from '@features/auth/models';
import { PasswordResetStore, passwordResetStoreEvents } from '@features/auth/state';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/ui/forms';

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
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG message service for displaying API errors.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx events stream.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

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
    this.passwordResetStore.isResending(),
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
    const currentRequest: PasswordResetRequestOutput | PasswordResetResendOutput | null =
      this.passwordResetStore.currentRequest();
    return currentRequest?.canResendIn ?? null;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up toast notifications for resend errors.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.events
      .on(passwordResetStoreEvents.resendFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
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
   * @returns {Promise<void>}
   */
  protected async handleVerify(values: OtpVerificationFormValues): Promise<void> {
    this.passwordResetStore.setVerificationCode(values.code);
    try {
      await this.router.navigate(['/auth/password-reset/new']);
    } catch (error: unknown) {
      console.error('Navigation failed', error);
    }
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
   * @returns {Promise<void>}
   */
  protected async handleCancel(): Promise<void> {
    this.passwordResetStore.clear();
    try {
      await this.router.navigate(['/auth/password-reset/forgot']);
    } catch (error: unknown) {
      console.error('Navigation failed', error);
    }
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
