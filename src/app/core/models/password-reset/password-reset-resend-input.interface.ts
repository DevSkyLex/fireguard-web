/**
 * Interface PasswordResetResendInput
 * @interface PasswordResetResendInput
 *
 * @description
 * Input for resending a password reset code.
 * Requires the current challenge token.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: PasswordResetResendInput = {
 *   token: 'abc123def456'
 * };
 * ```
 */
export interface PasswordResetResendInput {
  /**
   * Property token
   * @readonly
   *
   * @description
   * The current challenge token for the password reset.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly token: string;
}
