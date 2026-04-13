import type { FormControl } from '@angular/forms';
import type { ForgotPasswordFormValues } from './forgot-password-form-values.type';

/**
 * Type ForgotPasswordFormData
 * @type ForgotPasswordFormData
 *
 * @description
 * Form data structure for forgot password form.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type ForgotPasswordFormData = {
  [K in keyof ForgotPasswordFormValues]: FormControl<ForgotPasswordFormValues[K]>;
};
