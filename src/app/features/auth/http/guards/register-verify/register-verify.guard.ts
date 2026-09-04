import { inject } from '@angular/core';
import { type CanActivateFn, type GuardResult, type MaybeAsync, Router } from '@angular/router';
import { RegisterStore } from '@features/auth/state';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Register Verify Guard
 *
 * @description
 * Ensures the registration verify route has a challenge token. Reads the token
 * from the `token` query param — which is what lets the step survive a reload,
 * a back navigation, or a direct link — and rehydrates the {@link RegisterStore}
 * with it. Falls back to the token already held in memory. Redirects to the
 * registration page when neither exists.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True when a challenge token is available, otherwise a
 * UrlTree redirecting to the registration page.
 */
export const registerVerifyGuard: CanActivateFn = (route): MaybeAsync<GuardResult> => {
  /**
   * Constant registerStore
   * @const registerStore
   *
   * @description
   * Registration store holding the in-flight challenge token.
   *
   * @var {RegisterStore}
   */
  const registerStore: RegisterStore = inject<RegisterStore>(RegisterStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Angular Router used to redirect when no registration is in progress.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  /**
   * Constant returnUrl
   * @const returnUrl
   *
   * @description
   * Return URL to redirect to after registration is complete. Resolved from the
   * `returnUrl` query param, or defaults to an empty string.
   *
   * @var {string}
   */
  const returnUrl: string = resolveReturnUrl(route.queryParamMap.get('returnUrl'), '');

  /**
   * Constant queryParams
   * @const queryParams
   *
   * @description
   * Query parameters to pass to the registration page when redirecting. Includes
   * the `returnUrl` if it was present in the original request.
   *
   * @var {Record<string, string | undefined>}
   */
  const queryParams: Record<string, string | undefined> = { returnUrl: returnUrl || undefined };

  /**
   * Constant routeToken
   * @const routeToken
   *
   * @description
   * Challenge token carried by the URL, put there by the registration page so
   * the verify step owns its state across reloads.
   *
   * @var {string | null}
   */
  const routeToken: string | null = route.queryParamMap.get('token');

  /**
   * Constant storeToken
   * @const storeToken
   *
   * @description
   * Existing challenge token held by the {@link RegisterStore}, used as a
   * fallback when the URL carries none.
   *
   * @var {string | null}
   */
  const storeToken: string | null = registerStore.challengeToken();

  if (routeToken) {
    if (routeToken !== storeToken) registerStore.setChallengeToken(routeToken);
    return true;
  }

  if (storeToken) return true;

  return router.createUrlTree(['/auth/register'], { queryParams });
};
