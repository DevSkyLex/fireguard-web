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
  /** Current 6-digit TOTP code from the authenticator app. */
  readonly code: string;
}
