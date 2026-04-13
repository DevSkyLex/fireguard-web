import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/services/hydra-api';
import type {
  PasswordResetRequestInput,
  PasswordResetRequestOutput,
  PasswordResetResendInput,
  PasswordResetResendOutput,
  PasswordResetVerifyInput,
  PasswordResetVerifyOutput,
} from '@features/auth/models';

/**
 * Service PasswordResetService
 * @class PasswordResetService
 * @extends HydraApiService
 *
 * @description
 * Service for password reset operations.
 * Handles password reset request and verification endpoints.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordResetService extends HydraApiService {
  //#region Constants
  /**
   * Constant REQUEST_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for requesting a password reset.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly REQUEST_PATH: string = '/api/auth/password/reset/request';

  /**
   * Constant CONFIRM_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for confirming a password reset code.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly CONFIRM_PATH: string = '/api/auth/password/reset/confirm';

  /**
   * Constant RESEND_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint for resending a password reset code.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly RESEND_PATH: string = '/api/auth/password/reset/resend';
  //#endregion

  //#region Public Methods
  /**
   * Method request
   *
   * @description
  * Requests a password reset by sending a verification code to the user's email.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PasswordResetRequestInput} input - Request input data.
   *
   * @returns {Observable<PasswordResetRequestOutput>} - Password reset request response.
   *
   * @example
   * ```typescript
   * passwordResetService.request({ email: 'user@example.com' })
   *   .subscribe({
   *     next: (response) => console.log('Reset token:', response.token),
   *     error: (error) => console.error('Error:', error)
   *   });
   * ```
   */
  public request(input: PasswordResetRequestInput): Observable<PasswordResetRequestOutput> {
    return this.post<PasswordResetRequestInput, PasswordResetRequestOutput>(
      PasswordResetService.REQUEST_PATH,
      input,
    );
  }

  /**
   * Method confirm
   *
   * @description
   * Confirms the password reset code and sets the new password.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PasswordResetVerifyInput} input - Confirmation input data.
   *
   * @returns {Observable<PasswordResetVerifyOutput>} - Confirmation response.
   *
   * @example
   * ```typescript
   * passwordResetService.confirm({
   *   token: 'abc123',
   *   code: '123456',
   *   newPassword: 'SecureP@ssw0rd!'
   * })
   *   .subscribe({
   *     next: (response) => {
   *       if (response.success) {
   *         console.log('Password reset confirmed');
   *       }
   *     },
   *     error: (error) => console.error('Error:', error)
   *   });
   * ```
   */
  public confirm(input: PasswordResetVerifyInput): Observable<PasswordResetVerifyOutput> {
    return this.post<PasswordResetVerifyInput, PasswordResetVerifyOutput>(
      PasswordResetService.CONFIRM_PATH,
      input,
    );
  }

  /**
   * Method resend
   *
   * @description
   * Resends the password reset code.
   * Returns a new challenge token that must replace the old one.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PasswordResetResendInput} input - Resend input data.
   *
   * @returns {Observable<PasswordResetResendOutput>} - Resend response with new token.
   *
   * @example
   * ```typescript
   * passwordResetService.resend({ token: 'abc123' })
   *   .subscribe({
   *     next: (response) => {
   *       console.log('New token:', response.challengeToken);
   *     },
   *     error: (error) => console.error('Error:', error)
   *   });
   * ```
   */
  public resend(input: PasswordResetResendInput): Observable<PasswordResetResendOutput> {
    return this.post<PasswordResetResendInput, PasswordResetResendOutput>(
      PasswordResetService.RESEND_PATH,
      input,
    );
  }
  //#endregion
}
