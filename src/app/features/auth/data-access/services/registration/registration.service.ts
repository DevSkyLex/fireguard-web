import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  LoginOutput,
  RegisterInput,
  RegisterOutput,
  RegisterResendInput,
  RegisterVerifyInput,
} from '@features/auth/models';

/**
 * Service RegistrationService
 * @class RegistrationService
 * @extends HydraApiService
 *
 * @description
 * Service for public self-service registration operations: create an account,
 * resend the email-verification code, and verify the email (which auto-logs the
 * user in by returning session tokens).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class RegistrationService extends HydraApiService {
  //#region Constants
  /**
   * Constant REGISTER_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for creating a new account.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly REGISTER_PATH: string = '/api/auth/register';

  /**
   * Constant VERIFY_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for verifying the email and logging in.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly VERIFY_PATH: string = '/api/auth/register/verify';

  /**
   * Constant RESEND_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for resending the verification code.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly RESEND_PATH: string = '/api/auth/register/resend';
  //#endregion

  //#region Public Methods
  /**
   * Method register
   *
   * @description
   * Creates an account and sends an email-verification code.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RegisterInput} input - Registration input data.
   *
   * @returns {Observable<RegisterOutput>} - Registration response with the challenge token.
   */
  public register(input: RegisterInput): Observable<RegisterOutput> {
    return this.post<RegisterInput, RegisterOutput>(RegistrationService.REGISTER_PATH, input);
  }

  /**
   * Method verify
   *
   * @description
   * Verifies the email with the OTP code. On success the backend returns session
   * tokens (auto-login) shaped like a login response.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RegisterVerifyInput} input - Verification input data.
   *
   * @returns {Observable<LoginOutput>} - Auto-login response with the access token.
   */
  public verify(input: RegisterVerifyInput): Observable<LoginOutput> {
    return this.post<RegisterVerifyInput, LoginOutput>(RegistrationService.VERIFY_PATH, input);
  }

  /**
   * Method resend
   *
   * @description
   * Resends the email-verification code, returning a new challenge token that
   * must replace the old one.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RegisterResendInput} input - Resend input data.
   *
   * @returns {Observable<RegisterOutput>} - Resend response with the new token.
   */
  public resend(input: RegisterResendInput): Observable<RegisterOutput> {
    return this.post<RegisterResendInput, RegisterOutput>(RegistrationService.RESEND_PATH, input);
  }
  //#endregion
}
