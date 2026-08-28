import type { HydraItem } from '@core/api/models';

/**
 * Interface ConfirmEmailChangeInput
 * @interface ConfirmEmailChangeInput
 *
 * @description
 * Payload for `POST /api/me/email-change/confirm`. Public endpoint — the
 * emailed token is the credential, like the registration verification.
 *
 * @since 1.0.0
 */
export interface ConfirmEmailChangeInput {
  /** Confirmation token from the email sent to the new address. */
  readonly token: string;
}

/**
 * Interface ConfirmEmailChangeOutput
 * @interface ConfirmEmailChangeOutput
 *
 * @description
 * Response of `POST /api/me/email-change/confirm` (200). On success the
 * backend has applied the change and revoked every session and OAuth token —
 * the user signs in again with the new address. Invalid, expired or reused
 * tokens answer a neutral 400.
 *
 * @since 1.0.0
 */
export interface ConfirmEmailChangeOutput extends HydraItem {
  /** Whether the email address was changed successfully. */
  readonly success: boolean;

  /** Informational message. */
  readonly message: string;
}
