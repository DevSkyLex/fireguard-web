import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { ForgotPasswordForm, type ForgotPasswordFormValues } from '@features/auth/ui/forms';

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
  protected readonly passwordResetStore: PasswordResetStore =
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
        this.router
          .navigate(['/auth/password-reset/verify'], {
            queryParams: { token: request.challengeToken },
          })
          .catch(() => undefined);
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
