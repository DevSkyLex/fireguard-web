import { inject } from '@angular/core';
import { type CanActivateFn, type GuardResult, type MaybeAsync, Router } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Password Reset Verify Guard
 *
 * @description
 * Ensures the password reset verify route has a challenge token.
 * Reads the token from query params and stores it in PasswordResetStore.
 * Falls back to existing store token. Redirects to forgot page if missing.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access verify page, otherwise
 * a UrlTree redirecting to the forgot password page.
 */
export const passwordResetVerifyGuard: CanActivateFn = (route): MaybeAsync<GuardResult> => {
  /**
   * Constant passwordResetStore
   * @const passwordResetStore
   *
   * @description
   * Store for managing password reset state, including challenge token.
   * Used to store token from query params and check existing token.
   *
   * @var {PasswordResetStore}
   */
  const passwordResetStore: PasswordResetStore = inject<PasswordResetStore>(PasswordResetStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Angular Router for navigation and redirection based on password reset state.
   * Used to redirect users to forgot password page if token is missing.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  /**
   * Constant returnUrl
   * @const returnUrl
   *
   * @description
   * Return URL to redirect to after password reset is complete. Resolved from the
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
   * Query parameters to include in the redirect URL when navigating to the forgot password page.
   * Includes the returnUrl if present, otherwise undefined.
   *
   * @var {object}
   */
  const queryParams: Record<string, string | undefined> = { returnUrl: returnUrl || undefined };

  /**
   * Constant token
   * @const token
   *
   * @description
   * Challenge token for password reset flow, required for verification step.
   * Read from query params or existing store value. If missing, user is redirected.
   *
   * @var {string | null}
   */
  const routeToken: string | null = route.queryParamMap.get('token');

  /**
   * Constant storeToken
   * @const storeToken
   *
   * @description
   * Existing challenge token stored in PasswordResetStore.
   * Used as fallback if no token is present in query params.
   *
   * @var {string | null}
   */
  const storeToken: string | null = passwordResetStore.challengeToken();

  if (routeToken) {
    if (routeToken !== storeToken) passwordResetStore.setChallengeToken(routeToken);
    return true;
  }

  if (storeToken) return true;

  return router.createUrlTree(['/auth/password-reset/forgot'], { queryParams });
};
