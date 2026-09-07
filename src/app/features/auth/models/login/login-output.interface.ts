import type { HydraItem } from '@core/api/models';

/**
 * Type TokenType
 * @type TokenType
 *
 * @description Bearer token type returned by authentication endpoints.
 * @since 1.0.0
 */
export type TokenType = 'Bearer';

/**
 * Type MfaMethod
 * @type MfaMethod
 *
 * @description Supported delivery methods for a Fireguard MFA challenge.
 * @since 1.0.0
 */
export type MfaMethod = 'email' | 'sms' | 'totp';

/**
 * Interface LoginOutputBase
 * @interface LoginOutputBase
 *
 * @description
 * Fields shared by authenticated sessions and pending MFA challenges.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
interface LoginOutputBase extends HydraItem {
  /**
   * Property token_type
   * @readonly
   *
   * @description Bearer token type used when the response establishes a session.
   * @since 1.0.0
   * @type {TokenType}
   */
  readonly token_type: TokenType;

  /**
   * Property scope
   * @readonly
   *
   * @description Space-separated OAuth scopes granted to an established session.
   * @since 1.0.0
   * @type {string | null | undefined}
   */
  readonly scope?: string | null;

  /**
   * Property return_url
   * @readonly
   *
   * @description Validated application-local destination returned by federated sign-in.
   * @since 1.1.0
   * @type {string | null | undefined}
   */
  readonly return_url?: string | null;

  /**
   * Property new_account
   * @readonly
   *
   * @description Whether federated sign-in provisioned the Fireguard account.
   * @since 1.1.0
   * @type {boolean | null | undefined}
   */
  readonly new_account?: boolean | null;

  /**
   * Property mfa_token
   * @readonly
   *
   * @description Temporary pre-authentication token when an MFA challenge is pending.
   * @since 1.0.0
   * @type {string | null | undefined}
   */
  readonly mfa_token?: string | null;

  /**
   * Property challenge_token
   * @readonly
   *
   * @description Server challenge reference when an MFA challenge is pending.
   * @since 1.0.0
   * @type {string | null | undefined}
   */
  readonly challenge_token?: string | null;

  /**
   * Property mfa_method
   * @readonly
   *
   * @description Delivery method when an MFA challenge is pending.
   * @since 1.0.0
   * @type {MfaMethod | null | undefined}
   */
  readonly mfa_method?: MfaMethod | null;

  /**
   * Property mfa_destination
   * @readonly
   *
   * @description Masked delivery destination when one exists.
   * @since 1.0.0
   * @type {string | null | undefined}
   */
  readonly mfa_destination?: string | null;

  /**
   * Property mfa_resend_in
   * @readonly
   *
   * @description Seconds before another MFA code may be requested.
   * @since 1.0.0
   * @type {number | null | undefined}
   */
  readonly mfa_resend_in?: number | null;
}

/**
 * Interface AuthenticatedLoginOutput
 * @interface AuthenticatedLoginOutput
 *
 * @description Successful authentication response containing a usable access token.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthenticatedLoginOutput extends LoginOutputBase {
  /**
   * Property mfa_required
   * @readonly
   *
   * @description Discriminant showing that authentication is complete.
   * @since 1.0.0
   * @type {false | null | undefined}
   */
  readonly mfa_required?: false | null;

  /**
   * Property access_token
   * @readonly
   *
   * @description JWT access token for authenticated API requests.
   * @since 1.0.0
   * @type {string}
   */
  readonly access_token: string;

  /**
   * Property expires_in
   * @readonly
   *
   * @description Access-token lifetime in seconds.
   * @since 1.0.0
   * @type {number}
   */
  readonly expires_in: number;
}

/**
 * Interface MfaChallengeLoginOutput
 * @interface MfaChallengeLoginOutput
 *
 * @description
 * Partial authentication response that must be completed on the MFA screen.
 * API Platform may omit null session fields, so they stay optional here.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MfaChallengeLoginOutput extends LoginOutputBase {
  /**
   * Property mfa_required
   * @readonly
   *
   * @description Discriminant showing that a second factor is required.
   * @since 1.0.0
   * @type {true}
   */
  readonly mfa_required: true;

  /**
   * Property access_token
   * @readonly
   *
   * @description No access token exists before MFA verification.
   * @since 1.0.0
   * @type {null | undefined}
   */
  readonly access_token?: null;

  /**
   * Property expires_in
   * @readonly
   *
   * @description No access-token lifetime exists before MFA verification.
   * @since 1.0.0
   * @type {null | undefined}
   */
  readonly expires_in?: null;

  /**
   * Property mfa_token
   * @readonly
   *
   * @description Temporary pre-authentication token submitted with the OTP.
   * @since 1.0.0
   * @type {string}
   */
  readonly mfa_token: string;
}

/**
 * Type LoginOutput
 * @type LoginOutput
 *
 * @description
 * Discriminated authentication result. `mfa_required: true` carries a pending
 * challenge; every other response carries a complete session.
 *
 * @since 1.1.0
 */
export type LoginOutput = AuthenticatedLoginOutput | MfaChallengeLoginOutput;
