/**
 * Interface LoginInput
 * @interface LoginInput
 *
 * @description
 * Input payload for user authentication.
 * Sent to POST /api/auth/login endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const credentials: LoginInput = {
 *   email: 'john.doe@example.com',
 *   password: 'SecureP@ssw0rd!',
 *   remember_me: true
 * };
 * ```
 */
export interface LoginInput {
  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address of the user attempting to authenticate.
   * Must be a valid email format.
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
   * Password of the user (minimum 8 characters).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly password: string;

  /**
   * Property remember_me
   * @readonly
   *
   * @description
   * Flag to extend session duration.
   * - true: 30 days session
   * - false/undefined: 1 day session (default)
   *
   * @since 1.0.0
   *
   * @type {boolean | undefined}
   */
  readonly remember_me?: boolean;
}
