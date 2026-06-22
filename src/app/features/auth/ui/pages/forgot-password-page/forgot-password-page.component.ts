import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { PasswordResetStore, passwordResetStoreEvents } from '@features/auth/state';
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
  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx events stream.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

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

    this.events
      .on(passwordResetStoreEvents.requestFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: $localize`:@@common.error:Error`,
          detail: payload.message,
          life: 5000,
        });
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
