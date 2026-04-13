import type { LoginOutput, LogoutOutput } from '@features/auth/models';
import type { CallState } from '@core/state/request-state';

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

  //#region Call States
  readonly loginCallState: CallState<LoginOutput>;
  readonly logoutCallState: CallState<LogoutOutput>;
  readonly refreshCallState: CallState<LoginOutput>;
  readonly mfaVerifyCallState: CallState<LoginOutput>;
  readonly mfaResendCallState: CallState<LoginOutput>;
  //#endregion
}
