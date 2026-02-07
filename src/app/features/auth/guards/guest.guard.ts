import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@core/stores/auth';

/**
 * Guest Guard
 *
 * @description
 * Protects routes that should only be accessible
 * to guests (non-authenticated users).
 * Redirects authenticated users to home and users with pending MFA
 * to the MFA verification route.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access guest route, otherwise
 * a UrlTree redirecting to the appropriate route based on auth state.
 */
export const guestGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
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

  // If MFA is required, redirect to MFA verification flow
  if (authStore.mfaRequired()) {
    return router.createUrlTree(['/auth/mfa-verify']);
  }

  // Allow access if user is not authenticated
  if (!authStore.isAuthenticated()) return true;

  // Redirect authenticated users to home
  return router.createUrlTree(['/home']);
};

