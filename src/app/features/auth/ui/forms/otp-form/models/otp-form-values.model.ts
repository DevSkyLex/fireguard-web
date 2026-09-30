/**
 * Interface OtpFormValues
 * @interface OtpFormValues
 *
 * @description
 * The shape every one-time-code screen edits — registration verification, MFA
 * verification, and password-reset verification alike.
 *
 * @since 1.0.0
 */
export interface OtpFormValues {
  /**
   * Property code
   *
   * @description
   * One-time code entered for the active verification challenge.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  code: string;

  /**
   * Property trustDevice
   *
   * @description
   * Whether the operator asked to skip the second factor on this device next time — meaningful on
   * the MFA screen only.
   *
   * @type {boolean}
   */
  trustDevice: boolean;
}
