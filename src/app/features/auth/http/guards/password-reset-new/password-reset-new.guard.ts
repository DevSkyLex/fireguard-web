import { inject } from '@angular/core';
import { type CanActivateFn, type GuardResult, type MaybeAsync, Router } from '@angular/router';
import { PasswordResetStore } from '@features/auth/state';

/**
 * Password Reset New Guard
 *
 * @description
 * Protects the "set new password" route by ensuring
 * password reset flow state is complete (challenge
 * token and verification code).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {GuardResult} True if user can access new password page, otherwise
 * a UrlTree redirecting to the appropriate step in the password reset flow.
 */
export const passwordResetNewGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant passwordResetStore
   * @const passwordResetStore
   *
   * @description
   * Store for managing password reset state, including challenge
   * token and verification code.
   *
   * Used to check if user has completed previous steps of password reset flow
   * before allowing access to set new password page.
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
   * Used to redirect users to appropriate steps in password reset flow if they
   * haven't completed required steps (e.g., missing token or code).
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  /**
   * Constant token
   * @const token
   *
   * @description
   * Challenge token from password reset flow, required to set new password.
   * If missing, user is redirected to forgot password page.
   *
   * @var {string | null}
   */
  const token: string | null = passwordResetStore.challengeToken();

  /**
   * Constant code
   * @const code
   *
   * @description
   * Verification code from password reset flow, required to set new password.
   * If missing, user is redirected to verification page.
   *
   * @var {string | null}
   */
  const code: string | null = passwordResetStore.verificationCode();

  // If token is missing, redirect to forgot password page
  if (!token) return router.createUrlTree(['/auth/password-reset/forgot']);

  // If code is missing, redirect to verification page
  if (!code) return router.createUrlTree(['/auth/password-reset/verify']);

  return true;
};

