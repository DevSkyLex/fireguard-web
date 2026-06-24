import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { LoginForm, type LoginFormValues } from '@features/auth/ui/forms';

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
    // Navigate to MFA page when MFA is required
    effect(() => {
      if (this.authStore.mfaRequired()) {
        this.router.navigate(['/auth/mfa-verify']).catch(() => undefined);
      }
    });

    // Navigate to home when authenticated.
    // User profile bootstrap is handled by auth/account initializers.
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.router.navigate(['/']).catch(() => undefined);
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
