import type { FormControl } from '@angular/forms';
import type { NewPasswordFormValues } from './new-password-form-values.type';

/**
 * Type NewPasswordFormData
 * @type NewPasswordFormData
 *
 * @description
 * Form data structure for new password form.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type NewPasswordFormData = {
  [K in keyof NewPasswordFormValues]: FormControl<NewPasswordFormValues[K]>;
} & { confirmPassword: FormControl<string> };
