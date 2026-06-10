import type { FormControl } from '@angular/forms';
import type { LoginFormValues } from '../login-form-values';

/**
 * Type LoginFormData
 * @type {LoginFormData}
 *
 * @description
 * Login form data type.
 * Extends Credentials with FormControl wrappers and rememberMe option.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type LoginFormData = { [K in keyof LoginFormValues]: FormControl<LoginFormValues[K]> };
