/**
 * Interface DisableTotpInput
 * @interface DisableTotpInput
 *
 * @description
 * Payload for `POST /api/otp/totp/disable`: the current TOTP code, proving
 * possession of the authenticator app before disabling the method.
 *
 * @since 1.0.0
 */
export interface DisableTotpInput {
  /**
   * Property proofType
   *
   * @description
   * Selected TOTP disable proof type, with current TOTP as the default.
   */
  readonly proofType?: 'totp' | 'recovery_code';
  /**
   * Property code
   *
   * @description
   * Current 6-digit TOTP code from the authenticator app.
   */
  readonly code: string;
}
