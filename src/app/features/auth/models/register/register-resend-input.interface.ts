/**
 * Interface RegisterResendInput
 * @interface RegisterResendInput
 *
 * @description
 * Input payload for resending the email verification code.
 * Sent to POST /api/auth/register/resend endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: RegisterResendInput = {
 *   token: 'abc123'
 * };
 * ```
 */
export interface RegisterResendInput {
  /**
   * Property token
   * @readonly
   *
   * @description
   * Challenge token from the registration step.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly token: string;
}
