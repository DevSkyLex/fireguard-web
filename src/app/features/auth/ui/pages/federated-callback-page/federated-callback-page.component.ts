import { isPlatformBrowser, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  untracked,
  type EffectRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { FederatedProvider, LoginOutput } from '@features/auth/models';
import { FederatedReturnContextService } from '@features/auth/services';
import { AuthStore, FederatedAuthStore } from '@features/auth/state';
import { resolveFederatedAuthErrorMessage } from '@features/auth/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component FederatedCallbackPage
 * @class FederatedCallbackPage
 *
 * @description
 * Exchanges a provider callback code and hands the result to the existing
 * session store, preserving MFA and onboarding navigation.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-federated-callback-page',
  imports: [RouterLink, HlmButton, HlmSpinner],
  templateUrl: './federated-callback-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FederatedCallbackPage implements OnInit {
  /**
   * Property federatedStore
   * @readonly
   *
   * @description Federated callback request state.
   * @access protected
   * @since 1.0.0
   * @type {FederatedAuthStore}
   */
  protected readonly federatedStore: FederatedAuthStore = inject(FederatedAuthStore);

  /**
   * Property callbackInvalid
   * @readonly
   *
   * @description Whether the callback lacks usable code, state or provider values.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly callbackInvalid = signal<boolean>(false);

  /**
   * Property returnUrl
   * @readonly
   * @description Validated callback intent reused by both failure links and successful sign-in.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<string>}
   */
  protected readonly returnUrl = signal<string>('');

  /**
   * Property federatedErrorMessage
   * @readonly
   *
   * @description Maps callback error codes to localized, non-sensitive copy.
   * @access protected
   * @since 1.0.0
   * @type {typeof resolveFederatedAuthErrorMessage}
   */
  protected readonly federatedErrorMessage = resolveFederatedAuthErrorMessage;

  /**
   * Property authStore
   * @readonly
   *
   * @description Existing owner of the authenticated session outcome.
   * @access private
   * @since 1.0.0
   * @type {AuthStore}
   */
  private readonly authStore: AuthStore = inject(AuthStore);

  /**
   * Property route
   * @readonly
   *
   * @description Active callback route and query values.
   * @access private
   * @since 1.0.0
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description Router used for outcome navigation.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property location
   * @readonly
   *
   * @description Angular location service used to remove callback secrets from browser history.
   * @access private
   * @since 1.1.0
   * @type {Location}
   */
  private readonly location: Location = inject(Location);

  /**
   * Property platformId
   * @readonly
   *
   * @description Runtime platform discriminator for browser-only callback work.
   * @access private
   * @since 1.0.0
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property returnContext
   * @readonly
   * @description Consumes tab-local OAuth recovery without retaining provider credentials.
   * @access private
   * @since 1.1.0
   * @type {FederatedReturnContextService}
   */
  private readonly returnContext: FederatedReturnContextService = inject(
    FederatedReturnContextService,
  );

  /**
   * Property handled
   *
   * @description Prevents duplicate navigation from repeated effect evaluation.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private handled: boolean = false;

  /**
   * Property callbackSessionRevision
   * @description Session generation that initiated this callback exchange.
   * @access private
   * @since 1.0.0
   * @type {number}
   */
  private callbackSessionRevision: number = this.authStore.sessionRevision();

  /**
   * Property outcome
   * @readonly
   *
   * @description Applies and consumes the completed session before navigating once.
   * @access private
   * @since 1.0.0
   * @type {EffectRef}
   */
  private readonly outcome: EffectRef = effect((): void => {
    const result: LoginOutput | null = this.federatedStore.completeLoginResult();
    if (!result || this.handled) return;
    if (this.callbackSessionRevision !== this.authStore.sessionRevision()) {
      this.handled = true;
      untracked(() => this.federatedStore.resetCompleteLogin());
      return;
    }

    this.handled = true;
    untracked((): void => {
      if (!result.mfa_required && !result.access_token) {
        this.federatedStore.resetCompleteLogin();
        this.callbackInvalid.set(true);
        return;
      }

      this.federatedStore.resetCompleteLogin();
      this.authStore.applySession(result);
      const returnUrl = this.returnContext.resolve(result.return_url) || this.returnUrl() || '/';
      if (result.mfa_required) {
        void this.router.navigate(['/auth/mfa-verify'], {
          queryParams: { returnUrl: returnUrl === '/' ? undefined : returnUrl },
          replaceUrl: true,
        });
      } else {
        void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }
    });
  });

  /**
   * Method ngOnInit
   * @method ngOnInit
   * @description
   * Removes callback secrets from history and starts the one-time exchange in
   * the browser. SSR must leave the authorization code untouched because its
   * session state cannot be transferred to the hydrating runtime.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.callbackSessionRevision = this.authStore.sessionRevision();

    const provider = this.toProvider(this.route.snapshot.paramMap.get('provider'));
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');

    const returnUrl =
      this.returnContext.consume(provider) ||
      this.returnContext.resolve(this.route.snapshot.queryParamMap.get('returnUrl'));
    this.returnUrl.set(returnUrl);
    const cleanPath = this.router.url.split('?')[0] ?? '/auth/login';
    const cleanUrl = returnUrl
      ? `${cleanPath}?returnUrl=${encodeURIComponent(returnUrl)}`
      : cleanPath;
    this.location.replaceState(cleanUrl);

    if (!provider || !state || (!code && !error) || (code !== null && error !== null)) {
      this.callbackInvalid.set(true);
      return;
    }
    const input = error ? { error, state } : { code: code as string, state };
    this.federatedStore.completeLogin({ provider, input });
  }

  /**
   * Method toProvider
   * @method toProvider
   * @description Narrows an untrusted route segment to a supported provider.
   * @access private
   * @since 1.0.0
   * @param {string | null} value - Provider route segment.
   * @returns {FederatedProvider | null} Supported provider or null.
   */
  private toProvider(value: string | null): FederatedProvider | null {
    return value === 'google' || value === 'microsoft' ? value : null;
  }
}
