/**
 * Interface PasswordResetRequestInput
 * @interface PasswordResetRequestInput
 *
 * @description
 * Input payload for requesting a password reset.
 * Sent to POST /api/auth/password/reset/request endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: PasswordResetRequestInput = {
 *   email: 'user@example.com'
 * };
 * ```
 */
export interface PasswordResetRequestInput {
  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address for password reset.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly email: string;
}
