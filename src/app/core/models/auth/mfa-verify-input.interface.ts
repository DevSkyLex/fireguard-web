/**
 * Interface MfaVerifyInput
 * @interface MfaVerifyInput
 *
 * @description
 * Input payload for MFA code verification.
 * Sent to POST /api/auth/mfa/verify endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: MfaVerifyInput = {
 *   preAuthToken: 'eyJ...',
 *   code: '123456'
 * };
 * ```
 */
export interface MfaVerifyInput {
  /**
   * Property preAuthToken
   * @readonly
   *
   * @description
   * The Pre-Auth Token received from the login response.
   * This is the mfa_token from LoginOutput.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly preAuthToken: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * The OTP code received by the user (via email, SMS, or TOTP app).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly code: string;
}
