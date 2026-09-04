import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
  type OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { OtpForm, type OtpFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';
import { PageHeading } from '@shared/page-heading';

/**
 * Component PasswordResetVerifyPage
 * @class PasswordResetVerifyPage
 *
 * @description
 * Route entry for entering the reset code. The code is not verified on its own:
 * the API confirms it together with the new password, so this step only records
 * it and hands over to the final screen, which `passwordResetNewGuard` gates on
 * exactly that recorded code.
 *
 * The step still exists as its own screen because asking for a code and a new
 * password in one form conflates two different failures — a wrong code and a
 * weak password — into one rejected submission.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-password-reset-verify-page',
  imports: [RouterLink, OtpForm, PageHeading],
  templateUrl: './password-reset-verify-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetVerifyPage implements OnInit {
  //#region Properties
  /**
   * Property passwordResetStore
   * @readonly
   *
   * @description
   * Holds the challenge token and the code this step records.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PasswordResetStore}
   */
  protected readonly passwordResetStore: PasswordResetStore =
    inject<PasswordResetStore>(PasswordResetStore);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Carries the `token` query parameter of an emailed reset link.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to hand over to the new-password step.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  /** @description The safe destination carried by links and subsequent auth steps. */
  protected readonly returnUrl: string = resolveReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
    '',
  );

  /** @description Replaces the URL challenge after resend so reloading never revives an expired challenge. */
  private readonly syncChallenge = effect((): void => {
    const token: string | null = this.passwordResetStore.challengeToken();
    if (!token || token === this.route.snapshot.queryParamMap.get('token')) return;
    untracked((): void => {
      void this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true,
        queryParams: { token, returnUrl: this.returnUrl || undefined },
      });
    });
  });

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Seeds the store from an emailed link. A visitor arriving from their inbox
   * has a token in the URL but nothing in the store, and the guard admits them
   * on the strength of that parameter — without this, the next step would find
   * no token and bounce them back to the start.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    const token: string | null = this.route.snapshot.queryParamMap.get('token');

    if (token !== null && this.passwordResetStore.challengeToken() === null) {
      this.passwordResetStore.setChallengeToken(token);
    }
  }
  //#endregion

  //#region Methods
  /**
   * Method verify
   * @method verify
   *
   * @description
   * Records the code and moves on. Nothing is sent yet: the API validates the
   * code and the new password in one call.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpFormValues} values - The entered code.
   *
   * @returns {void}
   */
  protected verify(values: OtpFormValues): void {
    this.passwordResetStore.setVerificationCode(values.code);

    void this.router.navigate(['/auth/password-reset/new'], {
      queryParams: { returnUrl: this.returnUrl || undefined },
    });
  }

  /**
   * Method resend
   * @method resend
   *
   * @description
   * Asks for a new reset code.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected resend(): void {
    this.passwordResetStore.resend();
  }
  //#endregion
}
