/**
 * Interface RegisterFormValues
 * @interface RegisterFormValues
 *
 * @description
 * The shape the sign-up form edits. `confirmPassword` exists only here: the
 * API contract (`RegisterInput`) never carries it, so the page drops it when
 * mapping to transport.
 *
 * @since 1.0.0
 */
export interface RegisterFormValues {
  /**
   * Property firstName
   *
   * @description
   * Given name submitted when creating the account.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  firstName: string;

  /**
   * Property lastName
   *
   * @description
   * Family name submitted when creating the account.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  lastName: string;

  /**
   * Property email
   *
   * @description
   * Address used to create the account and deliver verification messages.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  email: string;

  /**
   * Property password
   *
   * @description
   * New account password checked against the shared auth password rules.
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
   * Form-only confirmation compared against the new password before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  confirmPassword: string;
}
