/**
 * Type OtpVerificationFormValues
 * @type {OtpVerificationFormValues}
 *
 * @description
 * OTP verification form values type (emitted on submit).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OtpVerificationFormValues {
  /**
   * Property code
   * @readonly
   *
   * @description
   * The OTP code entered by the user.
   *
   * @since 2.0.0
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property trustDevice
   * @readonly
   *
   * @description
   * Whether to trust this device.
   * Only relevant if showTrustDevice was enabled in the form.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly trustDevice: boolean;
}
