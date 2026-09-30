/**
 * Interface AccountEmailChangeFormValues
 * @interface AccountEmailChangeFormValues
 *
 * @description
 * The email change request: the new address, and the current password the
 * backend verifies before emailing the confirmation link to it.
 *
 * @since 1.0.0
 */
export interface AccountEmailChangeFormValues {
  /**
   * Property newEmail
   *
   * @description
   * Destination address that receives the email ownership confirmation link.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  newEmail: string;

  /**
   * Property currentPassword
   *
   * @description
   * Password the API verifies before it starts the address change.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  currentPassword: string;
}
