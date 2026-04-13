import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@features/auth/state';

/**
 * Auth Guard
 *
 * @description
 * Protects routes that require authentication.
 * Redirects to login if user is not authenticated.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access protected route, otherwise
 * a UrlTree redirecting to the login page.
 */
export const authGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
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
   * Used to redirect unauthenticated users to login page.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // If already authenticated, allow access
  if (authStore.isAuthenticated()) return true;

  // Redirect to login
  return router.createUrlTree(['/auth/login']);
};
