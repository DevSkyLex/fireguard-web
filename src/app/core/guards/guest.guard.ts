import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@core/stores/auth';

/**
 * Guest Guard
 *
 * @description
 * Protects routes that should only be accessible 
 * to guests (non-authenticated users). Redirects to dashboard 
 * if user is already authenticated.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // In routes
 * {
 *   path: 'login',
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 * ```
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
   * Used to redirect authenticated users to dashboard.
   * 
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Allow access if user is not authenticated
  if (!authStore.isAuthenticated()) return true;

  // Redirect authenticated users to dashboard
  return router.createUrlTree(['/dashboard']);
};
