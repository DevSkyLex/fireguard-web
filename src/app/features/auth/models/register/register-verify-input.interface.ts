/**
 * Interface RegisterVerifyInput
 * @interface RegisterVerifyInput
 *
 * @description
 * Input payload for verifying the email address of a new account.
 * Sent to POST /api/auth/register/verify endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: RegisterVerifyInput = {
 *   token: 'abc123',
 *   code: '123456'
 * };
 * ```
 */
export interface RegisterVerifyInput {
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
}
