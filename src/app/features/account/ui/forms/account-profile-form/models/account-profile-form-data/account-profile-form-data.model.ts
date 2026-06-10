import type { FormControl } from '@angular/forms';

/**
 * Interface AccountProfileFormData
 * @interface AccountProfileFormData
 *
 * @description
 * Strict reactive-form control model used by the account profile form.
 *
 * @since 1.0.0
 */
export interface AccountProfileFormData {
  /**
   * Property firstName
   *
   * @description
   * Non-nullable control containing the user's given name.
   *
   * @type {FormControl<string>}
   */
  readonly firstName: FormControl<string>;

  /**
   * Property lastName
   *
   * @description
   * Non-nullable control containing the user's family name.
   *
   * @type {FormControl<string>}
   */
  readonly lastName: FormControl<string>;
}
