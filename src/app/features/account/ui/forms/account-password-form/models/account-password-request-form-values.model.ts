/**
 * Interface AccountPasswordRequestFormValues
 * @interface AccountPasswordRequestFormValues
 *
 * @description
 * Step one of the password change: proving the current password before a code
 * is sent.
 *
 * @since 1.0.0
 */
export interface AccountPasswordRequestFormValues {
  /**
   * Property currentPassword
   *
   * @description
   * Existing password verified before the API sends a confirmation code.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  currentPassword: string;
}
