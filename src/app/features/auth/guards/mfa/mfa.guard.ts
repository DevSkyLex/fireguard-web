import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@core/stores/auth';

/**
 * MFA Guard
 *
 * @description
 * Protects the MFA verification route.
 * Only allows access when MFA verification is pending.
 * Redirects to login if no MFA is required, or to home if already authenticated.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access MFA verification page, otherwise
 * a UrlTree redirecting to the appropriate route based on auth state and MFA requirements.
 */
export const mfaGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant authStore
   * @const authStore
   *
   * @description
   * Authentication store for checking auth
   * state and MFA requirements.
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
   * Used to redirect users based on auth state and MFA requirements.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // If already authenticated, redirect to home
  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  // If MFA is required, allow access
  if (authStore.mfaRequired()) return true;

  // Otherwise, redirect to login
  return router.createUrlTree(['/auth/login']);
};
