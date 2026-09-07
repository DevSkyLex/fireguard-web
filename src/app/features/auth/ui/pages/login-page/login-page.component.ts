import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  EffectRef,
  inject,
  OnInit,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { FEDERATED_PROVIDER_ICONS } from '@features/auth/constants';
import type { FederatedProvider, LoginInput } from '@features/auth/models';
import { FederatedReturnContextService } from '@features/auth/services';
import { AuthStore, FederatedAuthStore } from '@features/auth/state';
import { LoginForm, type LoginFormValues } from '@features/auth/ui/forms';
import { resolveFederatedAuthErrorMessage, resolveReturnUrl } from '@features/auth/utils';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';

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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, LoginForm, PageHeading, HlmButton, HlmSeparator, HlmSpinner, NgIcon],
  providers: [provideIcons(FEDERATED_PROVIDER_ICONS)],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
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
   * Property federatedStore
   * @readonly
   *
   * @description
   * Owns provider availability and redirect creation state.
   *
   * @access protected
   * @since 1.1.0
   * @type {FederatedAuthStore}
   */
  protected readonly federatedStore = inject(FederatedAuthStore);

  /**
   * Property federatedErrorMessage
   * @readonly
   *
   * @description Maps stable Auth errors to localized, non-sensitive copy.
   * @access protected
   * @since 1.1.0
   * @type {typeof resolveFederatedAuthErrorMessage}
   */
  protected readonly federatedErrorMessage = resolveFederatedAuthErrorMessage;

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
  /**
   * Property document
   * @readonly
   *
   * @description
   * Browser document used for the full-page provider redirect.
   *
   * @access private
   * @since 1.1.0
   * @type {Document}
   */
  private readonly document = inject(DOCUMENT);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Runtime platform discriminator guarding browser navigation.
   *
   * @access private
   * @since 1.1.0
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property returnContext
   * @readonly
   * @description Preserves the local destination across a full-page provider redirect.
   * @access private
   * @since 1.1.0
   * @type {FederatedReturnContextService}
   */
  private readonly returnContext: FederatedReturnContextService = inject(
    FederatedReturnContextService,
  );
  //#endregion

  /**
   * Property returnUrl
   * @readonly
   *
   * @description Safe destination carried by links and subsequent authentication steps.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
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
      this.federatedStore.resetStart();

      if (hasChallenge) {
        void this.router.navigate(['/auth/mfa-verify'], {
          queryParams: { returnUrl: this.returnUrl || undefined },
        });

        return;
      }

      void this.router.navigateByUrl(
        resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    });
  });

  /**
   * Property federatedRedirect
   * @readonly
   *
   * @description
   * Performs the full-page redirect only after the backend persists state and PKCE.
   *
   * @access private
   * @since 1.1.0
   * @type {EffectRef}
   */
  private readonly federatedRedirect: EffectRef = effect((): void => {
    const url = this.federatedStore.startUrl();
    if (!url || !isPlatformBrowser(this.platformId)) return;

    untracked((): void => {
      const provider = this.federatedStore.pendingProvider();
      if (provider) this.returnContext.remember(provider, this.returnUrl || '/');
      this.federatedStore.resetStart();
      this.document.defaultView?.location.assign(url);
    });
  });
  //#endregion

  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads enabled providers early enough for SSR to hand off their availability.
   *
   * @access public
   * @since 1.1.0
   * @returns {void}
   */
  public ngOnInit(): void {
    this.returnContext.clear();
    this.federatedStore.loadProviders();
  }

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
    if (this.authStore.isLoggingIn() || this.federatedStore.startPending()) return;

    this.federatedStore.resetStart();
    const credentials: LoginInput = values.rememberMe
      ? { email: values.email, password: values.password, remember_me: true }
      : { email: values.email, password: values.password };

    this.authStore.login(credentials);
  }

  /**
   * Method signInWith
   * @method signInWith
   *
   * @description
   * Starts one provider flow while preserving the validated local destination.
   *
   * @access protected
   * @since 1.1.0
   * @param {FederatedProvider} provider - Provider selected by the user.
   * @returns {void}
   */
  protected signInWith(provider: FederatedProvider): void {
    if (this.authStore.isLoggingIn() || this.federatedStore.startPending()) return;

    this.federatedStore.startLogin({ provider, returnUrl: this.returnUrl || '/' });
  }

  /**
   * Method retryProviderDiscovery
   * @method retryProviderDiscovery
   *
   * @description Clears any stale start failure and asks the store to discover providers again.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected retryProviderDiscovery(): void {
    this.federatedStore.resetStart();
    this.federatedStore.loadProviders();
  }
  //#endregion
}
