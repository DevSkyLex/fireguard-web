import type { HydraItem } from '@core/api/models';

/**
 * Interface ConfirmTotpOutput
 * @interface ConfirmTotpOutput
 *
 * @description
 * Response of `POST /api/otp/totp/confirm`. On success, TOTP is activated for
 * the authenticated user.
 *
 * @since 1.0.0
 */
export interface ConfirmTotpOutput extends HydraItem {
  /** Whether TOTP was successfully activated. */
  readonly success: boolean;
}
