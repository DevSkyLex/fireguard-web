import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { LoginInput, LoginOutput, LogoutOutput, MfaResendInput, MfaVerifyInput } from '@core/models/auth';

/**
 * Service AuthService
 * @class AuthService
 * @extends {BaseApiService}
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
 * const authService = inject(AuthService);
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
@Injectable({ providedIn: 'root' })
export class AuthService extends BaseApiService {
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
    return this.post<LoginInput, LoginOutput>(
      `${AuthService.BASE_PATH}/login`,
      credentials,
    );
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
    return this.postAction<LogoutOutput>(
      `${AuthService.BASE_PATH}/logout`,
    );
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
   * @returns {Observable<LoginOutput>} Observable emitting a new login response with fresh token.
   */
  public refresh(): Observable<LoginOutput> {
    return this.postAction<LoginOutput>(
      `${AuthService.BASE_PATH}/refresh`,
    );
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
   * @returns {Observable<LoginOutput>} Observable emitting the login response with access token.
   */
  public mfaVerify(input: MfaVerifyInput): Observable<LoginOutput> {
    return this.post<MfaVerifyInput, LoginOutput>(
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
   * @returns {Observable<LoginOutput>} Observable emitting login response with new MFA tokens.
   *
   * @remarks
   * The response will contain updated mfa_token and challenge_token that should replace the old ones.
   */
  public mfaResend(input: MfaResendInput): Observable<LoginOutput> {
    return this.post<MfaResendInput, LoginOutput>(
      `${AuthService.BASE_PATH}/mfa/resend`,
      input,
    );
  }

  //#endregion
}
