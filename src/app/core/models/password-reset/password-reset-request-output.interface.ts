import type { HydraItem } from '@core/models/api';

/**
 * Interface PasswordResetRequestOutput
 * @interface PasswordResetRequestOutput
 *
 * @description
 * Response from password reset request endpoint.
 * Returned by POST /api/auth/password/reset/request.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const output: PasswordResetRequestOutput = {
 *   '@id': '/api/.well-known/genid/abc123',
 *   '@type': 'RequestPasswordResetOutput',
 *   success: true,
 *   message: 'If an account exists with this email, you will receive a password reset code.',
 *   challengeToken: 'abc123def456',
 *   maskedRecipient: 'j***e@e****e.com',
 *   expiresAt: '2026-02-03T12:00:00+00:00',
 *   maxAttempts: 5,
 *   canResendIn: 60
 * };
 * ```
 */
export interface PasswordResetRequestOutput extends HydraItem {
  /**
   * Property success
   * @readonly
   *
   * @description
   * Whether the request was accepted.
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
   * User-facing message for the request outcome.
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
   * Token for confirming password reset.
   * Can be null for anti-enumeration.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly challengeToken: string | null;

  /**
   * Property maskedRecipient
   * @readonly
   *
   * @description
   * Masked recipient email for display.
   * Can be null for anti-enumeration.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly maskedRecipient: string | null;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Token expiration timestamp (ISO 8601).
   * Can be null for anti-enumeration.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly expiresAt: string | null;

  /**
   * Property maxAttempts
   * @readonly
   *
   * @description
   * Maximum attempts allowed for confirmation.
   * Can be null for anti-enumeration.
   *
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly maxAttempts: number | null;

  /**
   * Property canResendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing another resend request.
   * Used for rate limiting and countdown display.
   * Can be null for anti-enumeration.
   *
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly canResendIn: number | null;
}
