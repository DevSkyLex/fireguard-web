import { inject } from '@angular/core';
import { type CanActivateFn, type GuardResult, type MaybeAsync, Router } from '@angular/router';
import { RegisterStore } from '@features/auth/state';

/**
 * Register Verify Guard
 *
 * @description
 * Ensures the registration verify route is only reachable when a registration is
 * actually in progress (a challenge token is held by the {@link RegisterStore}).
 * Otherwise redirects to the registration page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True when a challenge exists, otherwise a UrlTree
 * redirecting to the registration page.
 */
export const registerVerifyGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
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

  if (registerStore.hasChallenge()) {
    return true;
  }

  return router.createUrlTree(['/auth/register']);
};
