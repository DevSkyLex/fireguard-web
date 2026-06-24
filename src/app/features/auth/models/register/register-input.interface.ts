/**
 * Interface RegisterInput
 * @interface RegisterInput
 *
 * @description
 * Input payload for creating a new account.
 * Sent to POST /api/auth/register endpoint. The username is derived server-side
 * from the email, so it is not collected here.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const input: RegisterInput = {
 *   firstName: 'Jane',
 *   lastName: 'Doe',
 *   email: 'jane.doe@example.com',
 *   password: 'SecureP@ssw0rd!'
 * };
 * ```
 */
export interface RegisterInput {
  /**
   * Property firstName
   * @readonly
   *
   * @description
   * First name of the new user.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly firstName: string;

  /**
   * Property lastName
   * @readonly
   *
   * @description
   * Last name of the new user.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly lastName: string;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address of the new user.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property password
   * @readonly
   *
   * @description
   * Account password (must meet security requirements).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly password: string;
}
