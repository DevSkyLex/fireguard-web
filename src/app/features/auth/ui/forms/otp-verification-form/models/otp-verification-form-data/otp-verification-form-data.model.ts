import type { FormControl } from '@angular/forms';
import type { OtpVerificationFormValues } from '../otp-verification-form-values';

/**
 * Type OtpVerificationFormData
 * @type {OtpVerificationFormData}
 *
 * @description
 * OTP verification form data type.
 * Maps OtpVerificationFormValues to FormControl wrappers.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OtpVerificationFormData = {
  [K in keyof OtpVerificationFormValues]: FormControl<OtpVerificationFormValues[K]>;
};
