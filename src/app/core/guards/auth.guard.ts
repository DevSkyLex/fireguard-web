import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@core/stores/auth';

/**
 * Auth Guard
 *
 * @description
 * Protects routes that require authentication.
 * Redirects to login if user is not authenticated.
 * Allows access during SSR/SSG to enable prerendering.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // In routes
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 * ```
 */
export const authGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant platformId
   * @const platformId
   * 
   * @description
   * Angular platform ID for checking if running in browser
   * 
   * Used to allow access during prerendering to enable 
   * static generation of protected pages.
   * 
   * @var {object}
   */
  const platformId: object = inject<object>(PLATFORM_ID);

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

  // Allow access during SSR/SSG prerendering
  if (!isPlatformBrowser(platformId)) return true;

  // If already authenticated, allow access
  if (authStore.isAuthenticated()) return true;
  
  // Redirect to login
  return router.createUrlTree(['/auth/login']);
};
