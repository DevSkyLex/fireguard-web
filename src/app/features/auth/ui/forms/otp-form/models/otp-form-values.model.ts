/**
 * Interface OtpFormValues
 *
 * @description
 * The shape every one-time-code screen edits — registration verification, MFA
 * verification, and password-reset verification alike.
 *
 * @since 1.0.0
 */
export interface OtpFormValues {
  code: string;
  /** Whether the operator asked to skip the second factor on this device next time — meaningful on the MFA screen only. */
  trustDevice: boolean;
}
