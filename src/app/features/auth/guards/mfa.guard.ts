import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { AuthStore } from '@core/stores/auth';

/**
 * MFA Guard
 *
 * @description
 * Protects the MFA verification route.
 * Only allows access when MFA verification is pending.
 * Redirects to login if no MFA is required, or to home if already authenticated.
 * Allows access during SSR/SSG to enable prerendering.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access MFA verification page, otherwise
 * a UrlTree redirecting to the appropriate route based on auth state and MFA requirements.
 */
export const mfaGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant platformId
   * @const platformId
   *
   * @description
   * Angular platform ID for checking if running in browser
   * or during SSR/SSG prerendering.
   *
   * Used to allow access during prerendering to enable static
   * generation of MFA page.
   *
   * @var {object}
   */
  const platformId: object = inject<object>(PLATFORM_ID);

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

  // Allow access during SSR/SSG prerendering
  if (!isPlatformBrowser(platformId)) return true;

  // If already authenticated, redirect to home
  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  // If MFA is required, allow access
  if (authStore.mfaRequired()) return true;

  // Otherwise, redirect to login
  return router.createUrlTree(['/auth/login']);
};

