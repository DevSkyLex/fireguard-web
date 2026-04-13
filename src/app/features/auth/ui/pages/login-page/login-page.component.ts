import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { UserStore } from '@features/account/state';
import { AuthStore, authStoreEvents } from '@features/auth/state';
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
   * Property userStore
   * @readonly
   *
   * @description
   * User store for loading user profile.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserStore}
   */
  private readonly userStore: UserStore = inject<UserStore>(UserStore);

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

    // Navigate to home when authenticated and load user profile
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.userStore.load();
        this.router.navigate(['/']).catch(() => undefined);
      }
    });

    this.events
      .on(authStoreEvents.loginFailed)
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
