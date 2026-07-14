import type { HydraItem } from '@core/api/models';

/**
 * Interface DisableTotpOutput
 * @interface DisableTotpOutput
 *
 * @description
 * Response of `POST /api/otp/totp/disable`. On success, TOTP is disabled for
 * the authenticated user.
 *
 * @since 1.0.0
 */
export interface DisableTotpOutput extends HydraItem {
  /** Whether TOTP was successfully disabled. */
  readonly success: boolean;
}
