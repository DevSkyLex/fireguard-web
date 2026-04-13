import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { PasswordResetStore, passwordResetStoreEvents } from '@features/auth/state';
import { NewPasswordForm, type NewPasswordFormValues } from '@features/auth/ui/forms';

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
   * @since 3.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

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
    this.passwordResetStore.isConfirming(),
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up navigation after successful
   * password reset confirmation.
   *
   * @access public
   * @since 3.0.0
   */
  public constructor() {
    // Navigate to login after successful confirmation
    effect(() => {
      const operation = this.passwordResetStore.confirmCallState();
      if (operation.status === 'success') {
        this.passwordResetStore.clear();

        this.router
          .navigate(['/auth/login'], {
            queryParams: { passwordReset: 'success' },
          })
          .catch(() => undefined);
      }
    });

    this.events
      .on(passwordResetStoreEvents.confirmFailed)
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
    const code: string | null = this.passwordResetStore.verificationCode();
    if (!code) return;

    this.passwordResetStore.confirm({
      code: code,
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
   * @returns {Promise<void>}
   */
  protected async handlePasswordCancel(): Promise<void> {
    this.passwordResetStore.clear();
    await this.router.navigate(['/auth/login']).catch(() => undefined);
  }

  //#endregion
}
