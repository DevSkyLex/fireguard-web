import type { HydraItem } from '@core/models/api';

/**
 * Interface PasswordResetResendOutput
 * @interface PasswordResetResendOutput
 *
 * @description
 * Response from resending a password reset code.
 * Includes a new challenge token that must replace the old one.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const output: PasswordResetResendOutput = {
 *   '@id': '/api/.well-known/genid/xyz789',
 *   '@type': 'ResendPasswordResetOutput',
 *   success: true,
 *   message: 'A new password reset code has been sent.',
 *   challengeToken: 'new-token-xyz',
 *   maskedRecipient: 'j***e@e****e.com',
 *   expiresAt: '2024-01-01T12:34:56+00:00',
 *   maxAttempts: 5,
 *   canResendIn: 60
 * };
 * ```
 */
export interface PasswordResetResendOutput extends HydraItem {
  /**
   * Property success
   * @readonly
   *
   * @description
   * Whether the resend request was successful.
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
   * Human-readable response message.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property challengeToken
   * @readonly
   *
   * @description
   * New challenge token to use for verification.
   * This replaces the old token.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly challengeToken?: string | null;

  /**
   * Property maskedRecipient
   * @readonly
   *
   * @description
   * Masked recipient where the code was sent (e.g., 'j***e@e****e.com').
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly maskedRecipient?: string | null;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * ISO 8601 timestamp when the challenge expires.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly expiresAt?: string | null;

  /**
   * Property maxAttempts
   * @readonly
   *
   * @description
   * Maximum number of verification attempts allowed.
   *
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly maxAttempts?: number | null;

  /**
   * Property canResendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing another resend request.
   * Used for rate limiting and countdown display.
   *
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly canResendIn?: number | null;
}
