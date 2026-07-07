import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RegisterStore } from '@features/auth/state';
import { RegisterForm, type RegisterFormValues } from '@features/auth/ui/forms';

/**
 * Component RegisterPage
 * @class RegisterPage
 *
 * @description
 * Registration page. Hosts the {@link RegisterForm}, drives the
 * {@link RegisterStore}, and navigates to the email-verification step once the
 * account is created. Surfaces request errors (e.g. email already taken) as
 * toasts.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-page',
  imports: [RegisterForm, RouterModule],
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
   * Registration store driving account creation.
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
   * Active route used to forward the optional `returnUrl` query parameter
   * through to the verification step (e.g. invitation acceptance).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * Whether a registration request is in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() => this.registerStore.isRegistering());
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Navigates to the verify step once a challenge is issued, and shows a toast
   * when registration fails.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.registerStore.hasChallenge()) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router
          .navigate(['/auth/register/verify'], {
            queryParams: returnUrl ? { returnUrl } : {},
          })
          .catch(() => undefined);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleRegister
   *
   * @description
   * Handles registration form submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {RegisterFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleRegister(values: RegisterFormValues): void {
    this.registerStore.register(values);
  }
  //#endregion
}
