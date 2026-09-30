/**
 * Interface EmailRequestFormValues
 * @interface EmailRequestFormValues
 *
 * @description
 * A single email address — the shape a public, unauthenticated request edits.
 *
 * @since 1.0.0
 */
export interface EmailRequestFormValues {
  /**
   * Property email
   *
   * @description
   * Address that receives the requested password reset message.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  email: string;
}
