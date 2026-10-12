import type { PasswordPolicyOutput } from '@features/auth/models';

/**
 * Constant DEFAULT_PASSWORD_POLICY
 *
 * @description
 * Explicit test fixture matching the API default policy. Production forms always load their policy.
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicyOutput = {
  '@id': '/api/auth/password-policy',
  '@type': 'PasswordPolicy',
  minimumLength: 8,
  maximumLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  specialCharacters: '@$!%*?&#',
  allowedInitialCharacters:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&#',
};
