import type { HydraItem } from '@core/api/models';

/**
 * Interface PasswordResetVerifyOutput
 * @interface PasswordResetVerifyOutput
 *
 * @description
 * Response from password reset confirmation endpoint.
 * Returned by POST /api/auth/password/reset/confirm.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const output: PasswordResetVerifyOutput = {
 *   '@id': '/api/.well-known/genid/xyz789',
 *   '@type': 'ConfirmPasswordResetOutput',
 *   success: true,
 *   message: 'Password has been reset successfully.',
 *   errorCode: null,
 *   attemptsRemaining: 0
 * };
 * ```
 */
export interface PasswordResetVerifyOutput extends HydraItem {
  /**
   * Property success
   * @readonly
   *
   * @description
   * Whether the confirmation was successful.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly success: boolean;

  /**
   * Property message
   * @readonly
   *
   * @description
   * User-facing message for the confirmation outcome.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property errorCode
   * @readonly
   *
   * @description
   * Backend error code when confirmation fails.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly errorCode: string | null;

  /**
   * Property attemptsRemaining
   * @readonly
   *
   * @description
   * Remaining attempts before lockout.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly attemptsRemaining: number;
}
