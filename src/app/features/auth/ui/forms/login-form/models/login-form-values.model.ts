/**
 * Interface LoginFormValues
 * @interface LoginFormValues
 *
 * @description
 * The shape the sign-in form edits. Distinct from `LoginInput`: this is what
 * the user types, the transport DTO is what the API receives, and the page
 * maps one to the other (`ARCHITECTURE.md` §10.4).
 *
 * @since 1.0.0
 */
export interface LoginFormValues {
  /**
   * Property email
   *
   * @description
   * Address submitted as the account's sign-in identifier.
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
   * Password submitted for the current sign-in attempt.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  password: string;

  /**
   * Property rememberMe
   *
   * @description
   * Requests a persistent browser session when the sign-in form submits.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  rememberMe: boolean;
}
