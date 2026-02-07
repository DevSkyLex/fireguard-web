import { Component, ChangeDetectionStrategy, inject, computed, effect, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NewPasswordForm, type NewPasswordFormValues } from '@features/auth/forms/new-password-form';
import { PasswordResetStore } from '@core/stores/password-reset';
import { MessageService } from 'primeng/api';
import type { OperationStatus } from '@core/stores/operations';

/**
 * Component NewPasswordPage
 * @class NewPasswordPage
 *
 * @description
 * New password page component.
 * Displays form to set new password after verification.
 *
 * @version 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-password-page',
  imports: [NewPasswordForm],
  templateUrl: './new-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPasswordPage {
  //#region Properties
  /**
   * Property passwordResetStore
   * @readonly
   *
   * @description
   * Password reset store for accessing reset token.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {PasswordResetStore}
   */
  private readonly passwordResetStore: PasswordResetStore =
    inject<PasswordResetStore>(PasswordResetStore);

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
   * @since 3.0.0
   *
   * @type {Router}
   */
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Property previousConfirmStatus
   *
   * @description
   * Previous password reset confirm status used to detect transitions.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {OperationStatus}
   */
  private previousConfirmStatus: OperationStatus = 'idle';

  /**
   * Computed isResetting
   * @readonly
   *
   * @description
   * Whether password reset confirmation is in progress.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isResetting: Signal<boolean> = computed(() =>
    this.passwordResetStore.isConfirming()
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up navigation after successful password reset confirmation.
   *
   * @access public
   * @since 3.0.0
   */
  public constructor() {
    // Navigate to login after successful confirmation
    effect(() => {
      const operation = this.passwordResetStore.confirmOperation();
      if (operation.status === 'success') {
        this.passwordResetStore.clear();
        void this.router.navigate(['/auth/login'], {
          queryParams: { passwordReset: 'success' },
        });
      }
    });

    // Show password reset confirmation API errors as toast notifications
    effect(() => {
      const operation = this.passwordResetStore.confirmOperation();
      const currentStatus = operation.status;

      if (currentStatus === 'error' && this.previousConfirmStatus === 'loading') {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: operation.error?.message ?? 'Failed to reset password',
          life: 5000,
        });
      }

      this.previousConfirmStatus = currentStatus;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handlePasswordSubmit
   *
   * @description
   * Handles new password form submission.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {NewPasswordFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handlePasswordSubmit(values: NewPasswordFormValues): void {
    const code = this.passwordResetStore.verificationCode();

    if (!code) {
      void this.router.navigate(['/auth/password-reset/verify']);
      return;
    }

    this.passwordResetStore.confirm({
      code,
      newPassword: values.newPassword,
    });
  }

  /**
   * Method handlePasswordCancel
   *
   * @description
   * Handles password reset cancellation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handlePasswordCancel(): void {
    this.passwordResetStore.clear();
    void this.router.navigate(['/auth/login']);
  }
  //#endregion
}
