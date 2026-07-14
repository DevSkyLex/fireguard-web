import type { HydraItem } from '@core/api/models';

/**
 * Interface SetupTotpOutput
 * @interface SetupTotpOutput
 *
 * @description
 * Response of `POST /api/otp/totp/setup`. The backend generates a fresh
 * secret and provisioning URI on every call; neither is persisted, so the
 * result must be captured (or a new one generated) before it can be entered
 * into an authenticator app.
 *
 * @since 1.0.0
 */
export interface SetupTotpOutput extends HydraItem {
  /** Base32-encoded TOTP secret for manual authenticator entry. */
  readonly secret: string;

  /** `otpauth://` provisioning URI used to generate a QR code. */
  readonly qrCodeUri: string;
}
