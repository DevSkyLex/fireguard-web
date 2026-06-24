import type { FormControl } from '@angular/forms';
import type { RegisterFormValues } from '../register-form-values';

/**
 * Type RegisterFormData
 * @type {RegisterFormData}
 *
 * @description
 * Register form data type. Wraps each {@link RegisterFormValues} field in a typed
 * FormControl, plus a `confirmPassword` control used only for client-side
 * match validation (it is never emitted to the parent).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type RegisterFormData = {
  [K in keyof RegisterFormValues]: FormControl<RegisterFormValues[K]>;
} & {
  confirmPassword: FormControl<string>;
};
