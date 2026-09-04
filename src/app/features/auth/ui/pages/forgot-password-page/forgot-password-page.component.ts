import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { EmailRequestForm, type EmailRequestFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';
import { PageHeading } from '@shared/page-heading';

/**
 * Component ForgotPasswordPage
 * @class ForgotPasswordPage
 *
 * @description
 * Route entry for asking for a reset code. The request establishes the
 * challenge token that gates the two steps after it.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [RouterLink, EmailRequestForm, PageHeading],
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
   * Owns the request, the challenge token and the steps that follow.
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
   * Used to hand over to the verification step.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /** @description Reads the validated destination shared by the authentication steps. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * The submit control's text, bound rather than written in the template
   * because it feeds a component input, which `i18n-` does not reach.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly submitLabel: string = $localize`:@@auth.forgotPassword.submit:Send reset code`;
  //#endregion

  /** @description The safe destination carried by links and subsequent auth steps. */
  protected readonly returnUrl: string = resolveReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
    '',
  );

  //#region Lifecycle
  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Moves to verification once a challenge token exists — the same signal
   * `passwordResetVerifyGuard` reads, so the page cannot navigate somewhere the
   * guard would bounce it back from.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome = effect((): void => {
    if (this.passwordResetStore.challengeToken() === null) return;

    untracked((): void => {
      void this.router.navigate(['/auth/password-reset/verify'], {
        queryParams: {
          token: this.passwordResetStore.challengeToken(),
          returnUrl: this.returnUrl || undefined,
        },
      });
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method request
   * @method request
   *
   * @description
   * Asks the API for a reset code.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EmailRequestFormValues} values - The address to send it to.
   *
   * @returns {void}
   */
  protected request(values: EmailRequestFormValues): void {
    this.passwordResetStore.request({ email: values.email });
  }
  //#endregion
}
