import { Component, ChangeDetectionStrategy, inject, computed, effect, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { NewPasswordForm, type NewPasswordFormValues } from '@features/auth/forms/new-password-form';
import { PasswordResetStore } from '@core/stores/password-reset';
import { ToastService } from '@core/services/toast';
import type { OperationError } from '@core/stores/operations';

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
   * Property toastService
   * @readonly
   *
   * @description
   * Toast service for displaying API errors.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {ToastService}
   */
  private readonly toastService: ToastService =
    inject<ToastService>(ToastService);

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
   * Property resetErrorEffectInitialized
   *
   * @description
   * Prevents showing stale error toast on first effect run.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {boolean}
   */
  private resetErrorEffectInitialized: boolean = false;

  /**
   * Computed isResetting
   * @readonly
   *
   * @description
   * Whether password reset confirmation is in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isResetting: Signal<boolean> = computed(() =>
    this.passwordResetStore.isConfirming()
  );

  /**
   * Computed resetError
   * @readonly
   *
   * @description
   * Password reset confirmation error if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OperationError<unknown> | null>}
   */
  protected readonly resetError: Signal<OperationError<unknown> | null> = computed(() =>
    this.passwordResetStore.confirmError()
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Validates that reset token is available.
   */
  public constructor() {
    // Redirect if required state is missing
    const token = this.passwordResetStore.challengeToken();
    const code = this.passwordResetStore.verificationCode();

    if (!token) {
      void this.router.navigate(['/auth/password-reset/forgot']);
      return;
    }

    if (!code) {
      void this.router.navigate(['/auth/password-reset/verify']);
      return;
    }

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
      const error = this.resetError();

      if (!this.resetErrorEffectInitialized) {
        this.resetErrorEffectInitialized = true;
        return;
      }

      if (error) {
        this.toastService.error(error.message ?? 'Failed to reset password');
      }
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
