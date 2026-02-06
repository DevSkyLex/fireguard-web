import { Component, ChangeDetectionStrategy, inject, effect, computed, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { ForgotPasswordForm, type ForgotPasswordFormValues } from '@features/auth/forms/forgot-password-form';
import { PasswordResetStore } from '@core/stores/password-reset';
import { ToastService } from '@core/services/toast';
import type { OperationError } from '@core/stores/operations';

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
   * Computed requestError
   * @readonly
   *
   * @description
   * Password reset request error if any.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<OperationError<unknown> | null>}
   */
  protected readonly requestError: Signal<OperationError<unknown> | null> = computed(() =>
    this.passwordResetStore.requestError()
  );

  /**
   * Property requestErrorEffectInitialized
   *
   * @description
   * Prevents showing stale error toast on first effect run.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {boolean}
   */
  private requestErrorEffectInitialized: boolean = false;
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
      const error = this.requestError();

      if (!this.requestErrorEffectInitialized) {
        this.requestErrorEffectInitialized = true;
        return;
      }

      if (error) {
        this.toastService.error(error.message ?? 'Failed to send verification code');
      }
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
