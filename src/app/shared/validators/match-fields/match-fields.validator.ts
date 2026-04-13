import { AbstractControl, type ValidationErrors, type ValidatorFn } from '@angular/forms';

/**
 * Function matchFieldsValidator
 * @function matchFieldsValidator
 *
 * @description
 * Creates a cross-field validator to ensure two
 * controls have the same value.
 *
 * @version 1.0.0
 *
 * @param {string} first - Name of the first control to compare.
 * @param {string} second - Name of the second control to compare.
 *
 * @returns {ValidatorFn} A validator function that checks if
 * the specified controls match.
 */
export function matchFieldsValidator(first: string, second: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    /**
     * Constant firstControl
     * @const firstControl
     *
     * @description
     * Retrieves the first control from the form
     * group using the provided name.
     *
     * @type {AbstractControl | null}
     */
    const firstControl: AbstractControl | null = control.get(first);

    /**
     * Constant secondControl
     * @const secondControl
     *
     * @description
     * Retrieves the second control from the form
     * group using the provided name.
     *
     * @type {AbstractControl | null}
     */
    const secondControl: AbstractControl | null = control.get(second);

    // If either control is not found, return null (no error)
    if (!firstControl || !secondControl) return null;

    // If the values match, return null (no error), otherwise return an error object
    return firstControl.value === secondControl.value
      ? null
      : {
          passwordMismatch: true,
        };
  };
}
