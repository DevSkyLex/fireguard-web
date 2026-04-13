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
  //#region Properties
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

  /**
   * Property loginCallState
   * @readonly
   *
   * @description
   * Call state for the login operation, including
   * MFA verification steps.
   *
   * @since 1.0.0
   *
   * @type {CallState<LoginOutput>}
   */
  readonly loginCallState: CallState<LoginOutput>;

  /**
   * Property logoutCallState
   * @readonly
   *
   * @description
   * Call state for the logout operation, used to
   * manage async state and errors.
   *
   * @since 1.0.0
   *
   * @type {CallState<LogoutOutput>}
   */
  readonly logoutCallState: CallState<LogoutOutput>;

  /**
   * Property refreshCallState
   * @readonly
   *
   * @description
   * Call state for the token refresh operation, used to
   * manage async state and errors during token renewal.
   *
   * @since 1.0.0
   *
   * @type {CallState<LoginOutput>}
   */
  readonly refreshCallState: CallState<LoginOutput>;

  /**
   * Property mfaVerifyCallState
   * @readonly
   *
   * @description
   * Call state for the MFA verification operation, used to
   * manage async state and errors during MFA code verification.
   *
   * @since 1.0.0
   *
   * @type {CallState<LoginOutput>}
   */
  readonly mfaVerifyCallState: CallState<LoginOutput>;

  /**
   * Property mfaResendCallState
   * @readonly
   *
   * @description
   * Call state for the MFA OTP resend operation, used to
   * manage async state and errors during OTP resend requests.
   *
   * @since 1.0.0
   *
   * @type {CallState<LoginOutput>}
   */
  readonly mfaResendCallState: CallState<LoginOutput>;
  //#endregion
}
