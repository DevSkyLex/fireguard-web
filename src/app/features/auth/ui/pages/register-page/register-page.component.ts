import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  AfterRenderRef,
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
import type { FederatedProvider, RegisterInput } from '@features/auth/models';
import { FederatedReturnContextService } from '@features/auth/services';
import { FederatedAuthStore, RegisterStore } from '@features/auth/state';
import { RegisterForm, type RegisterFormValues } from '@features/auth/ui/forms';
import { resolveFederatedAuthErrorMessage, resolveReturnUrl } from '@features/auth/utils';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';

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
 * Federated providers use the same login flow as the sign-in page: the backend
 * creates a new active account when no identity exists, then the callback owns
 * session application and onward navigation.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-page',
  imports: [RouterLink, RegisterForm, PageHeading, HlmButton, HlmSeparator, HlmSpinner, NgIcon],
  providers: [provideIcons(FEDERATED_PROVIDER_ICONS)],
  templateUrl: './register-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage implements OnInit {
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
   * Property federatedStore
   * @readonly
   *
   * @description Owns provider availability and redirect creation state.
   * @access protected
   * @since 1.1.0
   * @type {FederatedAuthStore}
   */
  protected readonly federatedStore: FederatedAuthStore = inject(FederatedAuthStore);

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

  /** @description Browser document used for the full-page provider redirect. */
  private readonly document: Document = inject(DOCUMENT);

  /** @description Runtime platform discriminator guarding browser navigation. */
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

  /**
   * Property providerHydration
   * @readonly
   *
   * @description Consumes the provider availability handoff after browser hydration.
   * @access private
   * @since 1.1.0
   * @type {AfterRenderRef}
   */
  private readonly providerHydration: AfterRenderRef = afterNextRender((): void => {
    this.federatedStore.loadProviders();
  });
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
        queryParams: {
          token: this.registerStore.challengeToken(),
          returnUrl: this.returnUrl || undefined,
        },
      });
    });
  });

  /**
   * Property federatedRedirect
   * @readonly
   *
   * @description Redirects after the backend has persisted the OAuth state and PKCE verifier.
   * @access private
   * @since 1.1.0
   * @type {EffectRef}
   */
  private readonly federatedRedirect: EffectRef = effect((): void => {
    const url: string | null = this.federatedStore.startUrl();
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
   * @description Loads enabled providers for browser rendering and the SSR availability handoff.
   * @access public
   * @since 1.1.0
   * @returns {void}
   */
  public ngOnInit(): void {
    this.returnContext.clear();
    if (!isPlatformBrowser(this.platformId)) {
      this.federatedStore.loadProviders();
    }
  }

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
    if (this.registerStore.isRegistering() || this.federatedStore.startPending()) return;

    this.federatedStore.resetStart();
    const input: RegisterInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    };

    this.registerStore.register(input);
  }

  /**
   * Method signInWith
   * @method signInWith
   *
   * @description Starts a provider flow that signs in an existing identity or creates a new account.
   * @access protected
   * @since 1.1.0
   * @param {FederatedProvider} provider - Provider selected by the user.
   * @returns {void}
   */
  protected signInWith(provider: FederatedProvider): void {
    if (this.registerStore.isRegistering() || this.federatedStore.startPending()) return;

    this.federatedStore.startLogin({ provider, returnUrl: this.returnUrl || '/' });
  }

  /**
   * Method retryProviderDiscovery
   * @method retryProviderDiscovery
   *
   * @description Clears a stale start failure and reloads provider availability.
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
