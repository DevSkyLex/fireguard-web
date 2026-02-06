import type { LoginOutput, LogoutOutput } from '@core/models/auth';
import type { Operation } from '@core/stores/operations';

/**
 * Interface AuthState
 * @interface AuthState
 *
 * @description
 * State interface for the authentication store.
 * Manages access token, MFA state, and async operation states.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthState {
  //#region Initialization State
  /**
   * Property initialized
   * @readonly
   *
   * @description
   * Indicates if the auth state has been initialized.
   * Used to prevent flash of login page on app startup.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly initialized: boolean;
  //#endregion

  //#region Token State
  /**
   * Property accessToken
   * @readonly
   *
   * @description
   * Current JWT access token for API authentication.
   * Null when not authenticated.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly accessToken: string | null;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * Token expiration timestamp in milliseconds (epoch time).
   * Null when no token is present.
   *
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly expiresAt: number | null;
  //#endregion

  //#region MFA State
  /**
   * Property mfaRequired
   * @readonly
   *
   * @description
   * Indicates if MFA verification is pending.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly mfaRequired: boolean;

  /**
   * Property mfaToken
   * @readonly
   *
   * @description
   * Temporary Pre-Auth Token for MFA verification.
   * Null when MFA is not required.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly mfaToken: string | null;

  /**
   * Property challengeToken
   * @readonly
   *
   * @description
   * OTP challenge token reference.
   * Used to check challenge status or resend OTP.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly challengeToken: string | null;
  //#endregion

  //#region Operations
  /**
   * Property loginOperation
   * @readonly
   *
   * @description
   * Async operation state for login requests.
   *
   * @since 1.0.0
   *
   * @type {Operation<LoginOutput, unknown>}
   */
  readonly loginOperation: Operation<LoginOutput, unknown>;

  /**
   * Property logoutOperation
   * @readonly
   *
   * @description
   * Async operation state for logout requests.
   *
   * @since 1.0.0
   *
   * @type {Operation<LogoutOutput, unknown>}
   */
  readonly logoutOperation: Operation<LogoutOutput, unknown>;

  /**
   * Property refreshOperation
   * @readonly
   *
   * @description
   * Async operation state for token refresh requests.
   *
   * @since 1.0.0
   *
   * @type {Operation<LoginOutput, unknown>}
   */
  readonly refreshOperation: Operation<LoginOutput, unknown>;

  /**
   * Property mfaVerifyOperation
   * @readonly
   *
   * @description
   * Async operation state for MFA verification requests.
   *
   * @since 1.0.0
   *
   * @type {Operation<LoginOutput, unknown>}
   */
  readonly mfaVerifyOperation: Operation<LoginOutput, unknown>;

  /**
   * Property mfaResendOperation
   * @readonly
   *
   * @description
   * Async operation state for MFA code resend requests.
   *
   * @since 1.0.0
   *
   * @type {Operation<LoginOutput, unknown>}
   */
  readonly mfaResendOperation: Operation<LoginOutput, unknown>;
  //#endregion
}
