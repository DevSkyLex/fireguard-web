import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { ApiRequestOptions } from '@core/api/models';
import type { ConfirmEmailChangeInput, ConfirmEmailChangeOutput } from '@features/auth/models';

/**
 * Service EmailChangeService
 * @class EmailChangeService
 *
 * @description
 * Auth-owned transport for the public half of the sign-in email change: the
 * confirmation of the emailed token. It lives here rather than in
 * `features/account` for the same reason `PasswordResetService` does — the
 * endpoint is public and its page renders in the auth layout, where no
 * session may exist (the link lands in the new mailbox). The authenticated
 * half (request and cancel) belongs to account's `UserProfileService`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends HydraApiService
 */
@Service()
export class EmailChangeService extends HydraApiService {
  //#region Constants
  /**
   * Property CONFIRM_PATH
   * @readonly
   * @static
   *
   * @description
   * Endpoint confirming a sign-in email change with the emailed token.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly CONFIRM_PATH: string = '/api/me/email-change/confirm';
  //#endregion

  //#region Public Methods
  /**
   * Method confirm
   *
   * @description
   * Confirms the email change with the token received at the new address.
   * On success the backend revokes every session and OAuth token — the
   * caller must purge the local session and send the user back to sign-in.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ConfirmEmailChangeInput} input - The emailed confirmation token.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<ConfirmEmailChangeOutput>} - Confirmation response.
   */
  public confirm(
    input: ConfirmEmailChangeInput,
    options?: ApiRequestOptions,
  ): Observable<ConfirmEmailChangeOutput> {
    return this.post<ConfirmEmailChangeInput, ConfirmEmailChangeOutput>(
      EmailChangeService.CONFIRM_PATH,
      input,
      options,
    );
  }
  //#endregion
}
