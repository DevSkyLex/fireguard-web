import { Component, ChangeDetectionStrategy, inject, effect, computed, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { ForgotPasswordForm, type ForgotPasswordFormValues } from '@features/auth/forms/forgot-password-form';
import { PasswordResetStore } from '@core/stores/password-reset';
import { MessageService } from 'primeng/api';
import type { OperationStatus } from '@core/stores/operations';

/**
 * Component ForgotPasswordPage
 * @class ForgotPasswordPage
 *
 * @description
 * Forgot password page component.
 * Displays form to request password reset via email.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ForgotPasswordForm],
  templateUrl: './forgot-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  //#region Properties
  /**
   * Property passwordResetStore
   * @readonly
   *
   * @description
   * Password reset store for managing reset request.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {PasswordResetStore}
   */
  protected readonly passwordResetStore: PasswordResetStore = inject(PasswordResetStore);

  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG message service for displaying API errors.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

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
   * Property previousRequestStatus
   *
   * @description
   * Previous password reset request status used to detect transitions.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {OperationStatus}
   */
  private previousRequestStatus: OperationStatus = 'idle';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Sets up effects for navigation after request.
   */
  public constructor() {
    // Clear any existing reset request
    this.passwordResetStore.clear();

    // Navigate to verification when request succeeds
    effect(() => {
      const request = this.passwordResetStore.currentRequest();
      if (request?.challengeToken) {
        void this.router.navigate(['/auth/password-reset/verify'], {
          queryParams: { token: request.challengeToken }
        });
      }
    });

    // Show password reset request API errors as toast notifications
    effect(() => {
      const operation = this.passwordResetStore.requestOperation();
      const currentStatus = operation.status;

      if (currentStatus === 'error' && this.previousRequestStatus === 'loading') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: operation.error?.message ?? 'Failed to send verification code',
          life: 5000,
        });
      }

      this.previousRequestStatus = currentStatus;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleSubmit
   *
   * @description
   * Handles form submission.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {ForgotPasswordFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleSubmit(values: ForgotPasswordFormValues): void {
    this.passwordResetStore.request({ email: values.email });
  }
  //#endregion
}
