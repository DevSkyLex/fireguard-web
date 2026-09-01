import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { RegisterInput } from '@features/auth/models';
import { RegisterStore } from '@features/auth/state';
import { RegisterForm, type RegisterFormValues } from '@features/auth/ui/forms';
import { PageHeading } from '@shared/page-heading';

/**
 * Component RegisterPage
 * @class RegisterPage
 *
 * @description
 * Route entry for creating an account. Registration produces a
 * `pending_verification` account and a challenge; the verification screen is
 * what activates it, so this page's only outcome is to hand over to that step
 * (`FEATURE.md`, auth).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-page',
  imports: [RouterLink, RegisterForm, PageHeading],
  templateUrl: './register-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  //#region Properties
  /**
   * Property registerStore
   * @readonly
   *
   * @description
   * Root-provided registration state, which owns the request and the challenge.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {RegisterStore}
   */
  protected readonly registerStore: RegisterStore = inject<RegisterStore>(RegisterStore);

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
  //#endregion

  //#region Lifecycle
  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Moves to verification as soon as a challenge exists. `hasChallenge` is the
   * same signal `registerVerifyGuard` reads, so the page cannot navigate
   * somewhere the guard would bounce it back from. The challenge token rides
   * along as the `token` query param, which is what lets the verify step
   * rehydrate after a reload instead of bouncing back here.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome = effect((): void => {
    if (!this.registerStore.hasChallenge()) return;

    untracked((): void => {
      void this.router.navigate(['/auth/register/verify'], {
        queryParams: { token: this.registerStore.challengeToken() },
      });
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method register
   * @method register
   *
   * @description
   * Maps the form values onto the API contract, dropping the confirmation
   * field the backend never receives.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {RegisterFormValues} values - What the user typed.
   *
   * @returns {void}
   */
  protected register(values: RegisterFormValues): void {
    const input: RegisterInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    };

    this.registerStore.register(input);
  }
  //#endregion
}
