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
import type { FederatedProvider } from '@features/auth/models';
import { FederatedAuthStore } from '@features/auth/state';
import { resolveFederatedAuthErrorMessage } from '@features/auth/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component FederatedLinkCallbackPage
 * @class FederatedLinkCallbackPage
 *
 * @description
 * Finalizes a provider link while the current Fireguard session stays active,
 * then returns to account security.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-federated-link-callback-page',
  imports: [RouterLink, HlmButton, HlmSpinner],
  templateUrl: './federated-link-callback-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FederatedLinkCallbackPage implements OnInit {
  /**
   * Property federatedStore
   * @readonly
   *
   * @description Federated connection callback state.
   * @access protected
   * @since 1.0.0
   * @type {FederatedAuthStore}
   */
  protected readonly federatedStore: FederatedAuthStore = inject(FederatedAuthStore);

  /**
   * Property callbackInvalid
   * @readonly
   *
   * @description Whether callback values are incomplete or cancelled.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly callbackInvalid = signal<boolean>(false);

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
   * @description Router used for return navigation.
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
   * Property handled
   *
   * @description Prevents duplicate navigation from repeated effect evaluation.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private handled: boolean = false;

  /**
   * Property outcome
   * @readonly
   *
   * @description Returns to Security after the provider-link callback succeeds.
   * @access private
   * @since 1.0.0
   * @type {EffectRef}
   */
  private readonly outcome: EffectRef = effect((): void => {
    if (this.handled || this.federatedStore.completeLinkCallState().status !== 'success') return;
    this.handled = true;
    untracked((): void => {
      this.federatedStore.resetCompleteLink();
      void this.router.navigate(['/account/security'], { replaceUrl: true });
    });
  });

  /**
   * Method ngOnInit
   * @method ngOnInit
   * @description
   * Removes provider credentials from history and exchanges the code in the
   * browser. SSR leaves the one-time values untouched so the authenticated
   * browser runtime remains the sole owner of the connection result.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const provider = this.toProvider(this.route.snapshot.paramMap.get('provider'));
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');

    const cleanUrl = this.router.url.split('?')[0] ?? '/account/security';
    this.location.replaceState(cleanUrl);

    if (!provider || !state || (!code && !error) || (code !== null && error !== null)) {
      this.callbackInvalid.set(true);
      return;
    }
    const input = error ? { error, state } : { code: code as string, state };
    this.federatedStore.completeLink({ provider, input });
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
