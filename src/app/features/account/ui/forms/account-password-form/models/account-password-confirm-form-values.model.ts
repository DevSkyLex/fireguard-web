/**
 * Interface AccountPasswordConfirmFormValues
 * @interface AccountPasswordConfirmFormValues
 *
 * @description
 * Step two of the password change: the emailed code and the new password.
 * `confirmPassword` never leaves the form — it exists so the cross-field rule
 * has something to compare against, and the component emits only what the API
 * accepts.
 *
 * @since 1.0.0
 */
export interface AccountPasswordConfirmFormValues {
  /**
   * Property code
   *
   * @description
   * Email-delivered code required to confirm the password change.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  code: string;

  /**
   * Property newPassword
   *
   * @description
   * Replacement password submitted after client-side password rules pass.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  newPassword: string;

  /**
   * Property confirmPassword
   *
   * @description
   * Form-only confirmation compared with the replacement password and not sent to the API.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  confirmPassword: string;
}
