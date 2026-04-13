/**
 * Interface MfaResendInput
 * @interface MfaResendInput
 *
 * @description
 * Input for resending an MFA verification code.
 * Requires the pre-auth token from the initial login response.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: MfaResendInput = {
 *   preAuthToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export interface MfaResendInput {
  /**
   * Property preAuthToken
   * @readonly
   *
   * @description
   * The pre-auth token (mfa_token from login response).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly preAuthToken: string;
}
