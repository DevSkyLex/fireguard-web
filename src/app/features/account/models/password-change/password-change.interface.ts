import type { HydraItem } from '@core/models/api';

/**
 * Interface RequestPasswordChangeInput
 * @interface RequestPasswordChangeInput
 *
 * @description
 * Payload for `POST /api/me/password/request`. The current password is
 * verified before the OTP code is sent by email.
 *
 * @since 1.0.0
 */
export interface RequestPasswordChangeInput {
  /** Current password, verified before the OTP code is sent. */
  readonly currentPassword: string;
}

/**
 * Interface RequestPasswordChangeOutput
 * @interface RequestPasswordChangeOutput
 *
 * @description
 * Response of `POST /api/me/password/request` carrying the OTP challenge
 * details for the confirm step.
 *
 * @since 1.0.0
 */
export interface RequestPasswordChangeOutput extends HydraItem {
  /** Whether the request was processed successfully. */
  readonly success: boolean;

  /** Informational message. */
  readonly message: string;

  /** OTP challenge token for the confirm step. */
  readonly challengeToken: string | null;

  /** Masked email address the code was sent to. */
  readonly maskedRecipient: string | null;

  /** Expiration timestamp of the verification code. */
  readonly expiresAt: string | null;

  /** Maximum number of verification attempts. */
  readonly maxAttempts: number | null;
}

/**
 * Interface ConfirmPasswordChangeInput
 * @interface ConfirmPasswordChangeInput
 *
 * @description
 * Payload for `POST /api/me/password/confirm`.
 *
 * @since 1.0.0
 */
export interface ConfirmPasswordChangeInput {
  /** Challenge token from the password change request. */
  readonly token: string;

  /** OTP verification code received by email. */
  readonly code: string;

  /** New password (must meet security requirements). */
  readonly newPassword: string;
}

/**
 * Interface ConfirmPasswordChangeOutput
 * @interface ConfirmPasswordChangeOutput
 *
 * @description
 * Response of `POST /api/me/password/confirm`. On success the backend also
 * revokes every active session and OAuth token for the user.
 *
 * @since 1.0.0
 */
export interface ConfirmPasswordChangeOutput extends HydraItem {
  /** Whether the password was changed successfully. */
  readonly success: boolean;

  /** Informational or error message. */
  readonly message: string;

  /** Error code when the operation failed. */
  readonly errorCode?:
    | 'invalid_code'
    | 'expired'
    | 'max_attempts_exceeded'
    | 'invalid_token'
    | null;

  /** Number of verification attempts remaining. */
  readonly attemptsRemaining?: number | null;
}
