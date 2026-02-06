/**
 * Interface PasswordResetVerifyInput
 * @interface PasswordResetVerifyInput
 *
 * @description
 * Input payload for confirming password reset code.
 * Sent to POST /api/auth/password/reset/confirm endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: PasswordResetVerifyInput = {
 *   token: 'abc123',
 *   code: '123456',
 *   newPassword: 'SecureP@ssw0rd!'
 * };
 * ```
 */
export interface PasswordResetVerifyInput {
  /**
   * Property token
   * @readonly
   *
   * @description
   * Password reset token from request step.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * The verification code (typically 6 digits).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property newPassword
   * @readonly
   *
   * @description
   * New password to set for the account.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly newPassword: string;
}
