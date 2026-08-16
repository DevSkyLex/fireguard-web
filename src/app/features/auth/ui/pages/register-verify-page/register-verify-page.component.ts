import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore, RegisterStore } from '@features/auth/state';
import { OtpForm, type OtpFormValues } from '@features/auth/ui/forms';
import { PageHeading } from '@shared/page-heading';

/**
 * Component RegisterVerifyPage
 * @class RegisterVerifyPage
 *
 * @description
 * Route entry for the email-verification step. Verifying activates the
 * `pending_verification` account and auto-logs the user in, so the destination
 * is onboarding rather than sign-in (`FEATURE.md`, auth).
 *
 * The store applies the returned session itself; this page only watches for the
 * session to exist and leaves.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-verify-page',
  imports: [OtpForm, PageHeading],
  templateUrl: './register-verify-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterVerifyPage {
  //#region Properties
  /**
   * Property registerStore
   * @readonly
   *
   * @description
   * Owns the challenge, the verification request and the resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {RegisterStore}
   */
  protected readonly registerStore: RegisterStore = inject<RegisterStore>(RegisterStore);

  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Read only to detect the session the verification establishes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  private readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to leave for onboarding once the account is active.
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
   * Leaves for onboarding once the auto-login has taken effect. Registration
   * never creates an organization — onboarding owns that.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome = effect((): void => {
    if (!this.authStore.isAuthenticated()) return;

    untracked((): void => {
      void this.router.navigate(['/onboarding']);
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Submits the code. The challenge token stays in the store, so only the code
   * travels from the form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpFormValues} values - The entered code.
   *
   * @returns {void}
   */
  protected verify(values: OtpFormValues): void {
    this.registerStore.verify({ code: values.code });
  }

  /**
   * Method resend
   * @method resend
   *
   * @description
   * Asks for a new verification email.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected resend(): void {
    this.registerStore.resend();
  }
  //#endregion
}
