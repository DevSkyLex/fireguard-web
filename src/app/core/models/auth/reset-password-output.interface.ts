import type { HydraItem } from '@core/models/api';

/**
 * Interface ResetPasswordOutput
 * @interface ResetPasswordOutput
 *
 * @description
 * Response from password reset endpoint.
 * Returned by POST /api/auth/password/reset.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ResetPasswordOutput extends HydraItem {
  /**
   * Property success
   * @readonly
   *
   * @description
   * Whether the password reset was successful.
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
   * Success message.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly message?: string | null;
}
