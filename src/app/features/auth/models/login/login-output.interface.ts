import type { HydraItem } from '@core/models/api';

/**
 * Type TokenType
 * @type TokenType
 *
 * @description
 * Type alias for the Bearer token type literal (always 'Bearer' per OAuth2).
 *
 * @since 1.0.0
 */
export type TokenType = 'Bearer';

/**
 * Type MfaMethod
 * @type MfaMethod
 *
 * @description
 * MFA delivery method types.
 *
 * @since 1.0.0
 */
export type MfaMethod = 'email' | 'sms' | 'totp';

/**
 * Interface LoginOutput
 * @interface LoginOutput
 *
 * @description
 * Response from successful authentication.
 * Returned by POST /api/auth/login and POST /api/auth/refresh endpoints.
 *
 * When MFA is required, access_token will be empty and mfa_required will be true.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // Successful login (no MFA)
 * const response: LoginOutput = {
 *   '@id': '/api/auth/login',
 *   '@type': 'Token',
 *   access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   token_type: 'Bearer',
 *   expires_in: 3600,
 *   scope: 'openid profile email'
 * };
 *
 * // MFA required
 * const mfaResponse: LoginOutput = {
 *   '@id': '/api/auth/login',
 *   '@type': 'Token',
 *   access_token: '',
 *   token_type: 'Bearer',
 *   expires_in: 0,
 *   mfa_required: true,
 *   mfa_token: 'eyJ...',
 *   challenge_token: 'abc...'
 * };
 * ```
 */
export interface LoginOutput extends HydraItem {
  /**
   * Property access_token
   * @readonly
   *
   * @description
   * JWT access token for API authentication.
   * Empty string when MFA is required.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly access_token: string;

  /**
   * Property token_type
   * @readonly
   *
   * @description
   * Token type (always 'Bearer' per OAuth2 specification).
   *
   * @since 1.0.0
   *
   * @type {TokenType}
   */
  readonly token_type: TokenType;

  /**
   * Property expires_in
   * @readonly
   *
   * @description
   * Token lifetime in seconds from the time of issuance.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly expires_in: number;

  /**
   * Property scope
   * @readonly
   *
   * @description
   * Space-separated list of granted OAuth2 scopes.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly scope?: string | null;

  /**
   * Property mfa_required
   * @readonly
   *
   * @description
   * If true, authentication is incomplete and user must verify MFA code.
   *
   * @since 1.0.0
   *
   * @type {boolean | null | undefined}
   */
  readonly mfa_required?: boolean | null;

  /**
   * Property mfa_token
   * @readonly
   *
   * @description
   * Temporary Pre-Auth Token (JWT) covering the partial authentication state.
   * Required for MFA verification step.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly mfa_token?: string | null;

  /**
   * Property challenge_token
   * @readonly
   *
   * @description
   * The OTP challenge token reference.
   * Used to check challenge status or resend OTP.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly challenge_token?: string | null;

  /**
   * Property mfa_method
   * @readonly
   *
   * @description
   * MFA code delivery method.
   * Indicates where the user should check for the verification code.
   *
   * @since 1.0.0
   *
   * @type {MfaMethod | null | undefined}
   */
  readonly mfa_method?: MfaMethod | null;

  /**
   * Property mfa_destination
   * @readonly
   *
   * @description
   * Masked destination where the MFA code was sent.
   * Examples:
   * - Email: "c*****t@v*************n.pro"
   * - Phone: "+336****5678"
   * - TOTP: Not applicable (null)
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly mfa_destination?: string | null;

  /**
   * Property mfa_resend_in
   * @readonly
   *
   * @description
   * Seconds to wait before allowing another MFA code resend request.
   * Used for rate limiting and countdown display.
   * Present when mfa_required is true.
   *
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly mfa_resend_in?: number | null;
}
