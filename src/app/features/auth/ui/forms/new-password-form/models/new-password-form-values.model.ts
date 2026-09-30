/**
 * Interface NewPasswordFormValues
 * @interface NewPasswordFormValues
 *
 * @description
 * The shape the reset form edits. `confirmPassword` exists only here — the API
 * takes the new password alone.
 *
 * @since 1.0.0
 */
export interface NewPasswordFormValues {
  /**
   * Property password
   *
   * @description
   * Replacement password validated against the shared auth password rules.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  password: string;

  /**
   * Property confirmPassword
   *
   * @description
   * Form-only value compared with the replacement password before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  confirmPassword: string;
}
