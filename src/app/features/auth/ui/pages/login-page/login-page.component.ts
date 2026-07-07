import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { LoginForm, type LoginFormValues } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Component LoginPage
 * @class LoginPage
 *
 * @description
 * Login page component.
 * Uses LoginForm and handles navigation after login.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-login-page',
  imports: [LoginForm, RouterModule],
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
   * Authentication store for accessing auth state.
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
   * Angular router for navigation.
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
   * Active route used to read the optional `returnUrl` query parameter so the
   * user is sent back to a deep link (e.g. an invitation) after signing in.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property returnUrl
   * @readonly
   *
   * @description
   * Raw `returnUrl` query parameter captured on activation, forwarded through
   * the MFA step and honored once authentication completes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string | null}
   */
  private readonly returnUrl: string | null = this.route.snapshot.queryParamMap.get('returnUrl');

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * Login loading state.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() => this.authStore.isLoggingIn());

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up effects for navigation after
   * authentication state changes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    // Navigate to MFA page when MFA is required, preserving the returnUrl.
    effect(() => {
      if (this.authStore.mfaRequired()) {
        this.router
          .navigate(['/auth/mfa-verify'], {
            queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {},
          })
          .catch(() => undefined);
      }
    });

    // Navigate to the returnUrl (or home) when authenticated.
    // User profile bootstrap is handled by auth/account initializers.
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.router.navigateByUrl(resolveReturnUrl(this.returnUrl)).catch(() => undefined);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleLogin
   *
   * @description
   * Handles login form submission.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {LoginFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleLogin(values: LoginFormValues): void {
    this.authStore.login({
      email: values.email,
      password: values.password,
      remember_me: values.remember_me,
    });
  }

  //#endregion
}
