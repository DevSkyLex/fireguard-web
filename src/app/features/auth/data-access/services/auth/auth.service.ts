import { Service } from '@angular/core';
import { type Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  AuthenticatedLoginOutput,
  LoginInput,
  LoginOutput,
  LogoutOutput,
  MfaChallengeLoginOutput,
  MfaResendInput,
  MfaVerifyInput,
} from '@features/auth/models';

/**
 * Service AuthService
 * @class AuthService
 * @extends {HydraApiService}
 *
 * @description
 * API service for authentication operations including login, logout,
 * token refresh, and MFA verification.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const authService = inject<AuthService>(AuthService);
 *
 * // Login
 * authService.login({ email: 'user@example.com', password: 'password' })
 *   .subscribe(response => {
 *     if (response.mfa_required) {
 *       // Handle MFA
 *     } else {
 *       // Store token
 *     }
 *   });
 *
 * // Logout
 * authService.logout().subscribe(() => {
 *   // Redirect to login
 * });
 * ```
 */
@Service()
export class AuthService extends HydraApiService {
  //#region Constants
  /**
   * Constant BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for all authentication API endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/auth';
  //#endregion

  //#region Public Methods
  /**
   * Method login
   *
   * @description
   * Authenticates a user with email and password credentials.
   * If MFA is enabled for the user, the response will indicate
   * that additional verification is required.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {LoginInput} credentials - User credentials (email, password, remember_me).
   *
   * @returns {Observable<LoginOutput>} Observable emitting the login response.
   *
   * @remarks
   * If MFA is required, the response will contain:
   * - mfa_required: true
   * - mfa_token: Pre-auth token for MFA verification
   * - challenge_token: OTP challenge token
   */
  public login(credentials: LoginInput): Observable<LoginOutput> {
    return this.post<LoginInput, LoginOutput>(`${AuthService.BASE_PATH}/login`, credentials);
  }

  /**
   * Method logout
   *
   * @description
   * Terminates the current user session by revoking all tokens
   * and clearing the refresh token cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<LogoutOutput>} Observable emitting the logout response.
   */
  public logout(): Observable<LogoutOutput> {
    return this.postAction<LogoutOutput>(`${AuthService.BASE_PATH}/logout`);
  }

  /**
   * Method refresh
   *
   * @description
   * Refreshes the access token using the refresh token cookie.
   * This is a silent operation that obtains a new access token
   * without requiring user interaction.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<AuthenticatedLoginOutput>} Observable emitting a fresh authenticated session.
   */
  public refresh(): Observable<AuthenticatedLoginOutput> {
    return this.postAction<AuthenticatedLoginOutput>(`${AuthService.BASE_PATH}/refresh`);
  }

  /**
   * Method mfaVerify
   *
   * @description
   * Verifies the MFA code to complete authentication.
   * Called after login returns mfa_required: true.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MfaVerifyInput} input - MFA verification input containing pre-auth token and OTP code.
   *
   * @returns {Observable<AuthenticatedLoginOutput>} Observable emitting the completed session.
   */
  public mfaVerify(input: MfaVerifyInput): Observable<AuthenticatedLoginOutput> {
    return this.post<MfaVerifyInput, AuthenticatedLoginOutput>(
      `${AuthService.BASE_PATH}/mfa/verify`,
      input,
    );
  }

  /**
   * Method mfaResend
   *
   * @description
   * Resends the MFA verification code.
   * Returns a new pre-auth token and challenge token.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MfaResendInput} input - MFA resend input containing pre-auth token.
   *
   * @returns {Observable<MfaChallengeLoginOutput>} Observable emitting the renewed MFA challenge.
   *
   * @remarks
   * The response will contain updated mfa_token and challenge_token that should replace the old ones.
   */
  public mfaResend(input: MfaResendInput): Observable<MfaChallengeLoginOutput> {
    return this.post<MfaResendInput, MfaChallengeLoginOutput>(
      `${AuthService.BASE_PATH}/mfa/resend`,
      input,
    );
  }

  //#endregion
}
