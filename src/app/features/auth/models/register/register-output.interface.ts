import type { HydraItem } from '@core/api/models';

/**
 * Interface RegisterOutput
 * @interface RegisterOutput
 *
 * @description
 * Response from the registration request and resend endpoints.
 * Returned by POST /api/auth/register and POST /api/auth/register/resend.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const output: RegisterOutput = {
 *   '@id': '/api/.well-known/genid/abc123',
 *   '@type': 'RegisterOutput',
 *   success: true,
 *   message: 'Your account has been created. Enter the verification code we sent to your email.',
 *   challengeToken: 'abc123def456',
 *   maskedRecipient: 'j***e@e****e.com',
 *   expiresAt: '2026-02-03T12:00:00+00:00',
 *   maxAttempts: 10,
 *   canResendIn: 60
 * };
 * ```
 */
export interface RegisterOutput extends HydraItem {
  /**
   * Property success
   * @readonly
   *
   * @description
   * Whether the registration request was accepted.
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
   * Token for verifying the email in the next step.
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
   * Masked recipient email where the verification code was sent.
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
   * Verification code expiration timestamp (ISO 8601).
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
   * Maximum verification attempts allowed.
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
   * Seconds to wait before a new code can be resent.
   *
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly canResendIn: number | null;
}
