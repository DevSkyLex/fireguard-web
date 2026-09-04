import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@features/auth/state';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Guest Guard
 *
 * @description
 * Protects routes that should only be accessible
 * to guests (non-authenticated users).
 * Redirects authenticated users to root and users with pending MFA
 * to the MFA verification route.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access guest route, otherwise
 * a UrlTree redirecting to the appropriate route based on auth state.
 */
export const guestGuard: CanActivateFn = (route): MaybeAsync<GuardResult> => {
  /**
   * Constant authStore
   * @const authStore
   *
   * @description
   * Authentication store for checking auth state.
   *
   * @var {AuthStore}
   */
  const authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Angular router for navigation.
   * Used to redirect users based on current auth state.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);
  const returnUrl: string = resolveReturnUrl(route.queryParamMap.get('returnUrl'), '');
  const queryParams = { returnUrl: returnUrl || undefined };

  if (authStore.mfaRequired()) {
    return router.createUrlTree(['/auth/mfa-verify'], { queryParams });
  }

  if (!authStore.isAuthenticated()) return true;

  return returnUrl ? router.parseUrl(returnUrl) : router.createUrlTree(['/']);
};
