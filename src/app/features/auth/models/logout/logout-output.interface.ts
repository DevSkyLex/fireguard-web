import type { HydraItem } from '@core/api/models';

/**
 * Interface LogoutOutput
 * @interface LogoutOutput
 *
 * @description
 * Response from successful logout.
 * Returned by POST /api/auth/logout endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const response: LogoutOutput = {
 *   '@id': '/api/auth/logout',
 *   '@type': 'Logout',
 *   message: 'Logged out successfully'
 * };
 * ```
 */
export interface LogoutOutput extends HydraItem {
  /**
   * Property message
   * @readonly
   *
   * @description
   * Confirmation message indicating successful logout.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly message: string;
}
