/**
 * Constant PASSWORD_MIN_LENGTH
 * @const PASSWORD_MIN_LENGTH
 *
 * @description
 * Shortest password the API accepts.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Constant PASSWORD_MAX_LENGTH
 * @const PASSWORD_MAX_LENGTH
 *
 * @description
 * Longest password the API accepts. Enforcing it client-side turns a rejected
 * submit into an inline hint while the user is still typing.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Constant PASSWORD_PATTERN
 * @const PASSWORD_PATTERN
 *
 * @description
 * Complexity rule every password must satisfy: at least one lowercase letter,
 * one uppercase letter, one digit and one special character among `@$!%*?&#`.
 *
 * Mirrors the `Assert\Regex` on the API's `RegisterInput`, `ConfirmPasswordResetInput`
 * and `ConfirmPasswordChangeInput` character for character. The server is the
 * authority; this exists so the user is told before the round-trip, never to
 * accept something the server would refuse. Any change here has to land there too.
 *
 * @since 1.0.0
 *
 * @type {RegExp}
 */
export const PASSWORD_PATTERN: RegExp =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;
