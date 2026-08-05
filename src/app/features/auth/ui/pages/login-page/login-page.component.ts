import {
  ChangeDetectionStrategy,
  Component,
  effect,
  EffectRef,
  inject,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { LoginInput } from '@features/auth/models';
import { AuthStore } from '@features/auth/state';
import { LoginForm, type LoginFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Component LoginPage
 * @class LoginPage
 *
 * @description
 * Route entry for signing in. It owns orchestration only: the form owns its
 * own values and rules, this page maps them to the transport DTO, calls the
 * store, and routes on the outcome (`ARCHITECTURE.md` §10.1).
 *
 * Two outcomes lead away from here — a completed session goes to the return
 * URL, and a pending MFA challenge goes to the verification screen. Both are
 * watched rather than awaited, because the store owns the request and this page
 * only reacts to where it lands.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, LoginForm],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  //#region Properties
  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Root-provided session state, which owns the sign-in request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  protected readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to leave once the outcome is known.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Carries the `returnUrl` query parameter set by the auth guard.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  //#endregion

  //#region Lifecycle
  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Leaves the page as soon as the store reaches a terminal state: an MFA
   * challenge takes priority over an established session, because a challenge
   * means the session is not established yet.
   *
   * The navigation is untracked so reading the route snapshot cannot make this
   * effect depend on it.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly outcome: EffectRef = effect((): void => {
    const hasChallenge: boolean = this.authStore.mfaRequired();
    const isAuthenticated: boolean = this.authStore.isAuthenticated();

    if (!hasChallenge && !isAuthenticated) return;

    untracked((): void => {
      if (hasChallenge) {
        void this.router.navigate(['/auth/mfa-verify'], {
          queryParamsHandling: 'preserve',
        });

        return;
      }

      void this.router.navigateByUrl(
        resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method login
   * @method login
   *
   * @description
   * Maps the form values onto the API contract and hands them to the store.
   * `remember_me` is omitted rather than sent as `false`, so the request stays
   * the shape the backend documents for a plain sign-in.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {LoginFormValues} values - What the user typed.
   *
   * @returns {void}
   */
  protected login(values: LoginFormValues): void {
    const credentials: LoginInput = values.rememberMe
      ? { email: values.email, password: values.password, remember_me: true }
      : { email: values.email, password: values.password };

    this.authStore.login(credentials);
  }
  //#endregion
}
