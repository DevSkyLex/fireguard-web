import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { NewPasswordForm, type NewPasswordFormValues } from '@features/auth/ui/forms';
import { PageHeading } from '@shared/page-heading';

/**
 * Component NewPasswordPage
 * @class NewPasswordPage
 *
 * @description
 * Final step of the password reset. It sends the recorded code together with
 * the new password — the API validates both in one call — and sends the user to
 * sign in with the credential they just set.
 *
 * `passwordResetNewGuard` guarantees both the challenge token and the code are
 * present before this page renders.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-password-page',
  imports: [NewPasswordForm, PageHeading],
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
   * Holds the token and the code, and owns the confirmation request.
   *
   * @access protected
   * @since 1.0.0
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
   * Used to send the user to sign in once the password is set.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Lifecycle
  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Leaves for sign-in once the reset has cleared the flow. The store empties
   * the token and the code on success, so their absence — with no error — is
   * what marks the reset as done.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome = effect((): void => {
    const isDone: boolean =
      this.passwordResetStore.challengeToken() === null &&
      this.passwordResetStore.confirmError() === null &&
      !this.passwordResetStore.isConfirming();

    if (!isDone) return;

    untracked((): void => {
      void this.router.navigate(['/auth/login']);
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method reset
   * @method reset
   *
   * @description
   * Sends the new password. The store supplies the token and the recorded code
   * itself, so only the password travels from the form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NewPasswordFormValues} values - The new password and its confirmation.
   *
   * @returns {void}
   */
  protected reset(values: NewPasswordFormValues): void {
    const code: string | null = this.passwordResetStore.verificationCode();
    if (code === null) return;

    this.passwordResetStore.confirm({ code, newPassword: values.password });
  }
  //#endregion
}
