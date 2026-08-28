import type { HydraItem } from '@core/api/models';

/**
 * Interface RequestEmailChangeInput
 * @interface RequestEmailChangeInput
 *
 * @description
 * Payload for `POST /api/me/email-change`. The current password is verified
 * before the confirmation link is emailed to the new address. A new request
 * replaces any pending one server-side.
 *
 * @since 1.0.0
 */
export interface RequestEmailChangeInput {
  /** The requested new sign-in email address. */
  readonly newEmail: string;

  /** Current password, verified before the confirmation email is sent. */
  readonly currentPassword: string;
}

/**
 * Interface RequestEmailChangeOutput
 * @interface RequestEmailChangeOutput
 *
 * @description
 * Response of `POST /api/me/email-change` (202). The confirmation link went
 * to the new address; an alert went to the current one.
 *
 * @since 1.0.0
 */
export interface RequestEmailChangeOutput extends HydraItem {
  /** Whether the email change request was accepted. */
  readonly success: boolean;

  /** Informational message. */
  readonly message: string;

  /** Expiration timestamp of the confirmation token (ISO 8601). */
  readonly expiresAt?: string | null;
}
