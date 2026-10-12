import { Service } from '@angular/core';
import { type Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { ApiRequestOptions } from '@core/api/models';
import type {
  ConfirmPasswordChangeInput,
  ConfirmPasswordChangeOutput,
  RequestEmailChangeInput,
  RequestEmailChangeOutput,
  RequestPasswordChangeInput,
  RequestPasswordChangeOutput,
  UpdateCurrentUserProfileInput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';

/**
 * Service UserProfileService
 * @class UserProfileService
 *
 * @description
 * Account-owned API service for retrieving the current authenticated user
 * profile. The backend endpoint resolves the authenticated user identity
 * together with global roles and permissions, while ownership remains with
 * the account feature because it owns current user profile state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends {HydraApiService}
 */
@Service()
export class UserProfileService extends HydraApiService {
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for the current authenticated user profile resource.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api';

  /**
   * Method getCurrentProfile
   *
   * @description
   * Retrieves the authenticated user's current profile and effective
   * global rights.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<UserProfileOutput>} Observable emitting the current profile.
   */
  public getCurrentProfile(): Observable<UserProfileOutput> {
    return this.getOne<UserProfileOutput>(`${UserProfileService.BASE_PATH}/me`);
  }

  /**
   * Method updateCurrentProfile
   *
   * @description
   * Partially updates the authenticated user's editable profile fields.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {UpdateCurrentUserProfileInput} input - Profile fields to update.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<UserProfileOutput>} Observable emitting the updated profile.
   */
  public updateCurrentProfile(
    input: UpdateCurrentUserProfileInput,
    options?: ApiRequestOptions,
  ): Observable<UserProfileOutput> {
    return this.patch<UpdateCurrentUserProfileInput, UserProfileOutput>(
      `${UserProfileService.BASE_PATH}/me`,
      input,
      options,
    );
  }

  /**
   * Method uploadCurrentAvatar
   *
   * @description
   * Replaces the authenticated user's avatar.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {Blob} avatar - Avatar image to upload.
   * @param {string} fileName - Original avatar file name.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<UserOutput>} Observable emitting the updated user.
   */
  public uploadCurrentAvatar(
    avatar: Blob,
    fileName: string = 'avatar',
    options?: ApiRequestOptions,
  ): Observable<UserOutput> {
    const body = new FormData();
    body.set('avatar', avatar, fileName);

    return this.putMultipart<UserOutput>(
      `${UserProfileService.BASE_PATH}/me/avatar`,
      body,
      options,
    );
  }

  /**
   * Method deactivateCurrentAccount
   *
   * @description
   * Deactivates the authenticated user's own account. The endpoint takes no
   * body; on success the backend revokes every active session and returns the
   * now-inactive profile. Reactivation is admin-only — signing in again does
   * not restore the account.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<UserProfileOutput>} Observable emitting the deactivated profile.
   */
  public deactivateCurrentAccount(options?: ApiRequestOptions): Observable<UserProfileOutput> {
    return this.postAction<UserProfileOutput>(
      `${UserProfileService.BASE_PATH}/me/deactivate`,
      options,
    );
  }

  /**
   * Method requestPasswordChange
   *
   * @description
   * Starts the authenticated password change flow: verifies the current
   * password then sends a one-time code to the user's email address.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestPasswordChangeInput} input - Current password to verify.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<RequestPasswordChangeOutput>} Observable emitting the OTP challenge
   *   details.
   */
  public requestPasswordChange(
    input: RequestPasswordChangeInput,
    options?: ApiRequestOptions,
  ): Observable<RequestPasswordChangeOutput> {
    return this.post<RequestPasswordChangeInput, RequestPasswordChangeOutput>(
      `${UserProfileService.BASE_PATH}/me/password/request`,
      input,
      options,
    );
  }

  /**
   * Method confirmPasswordChange
   *
   * @description
   * Completes the authenticated password change flow with the OTP code.
   * On success the backend revokes every active session and OAuth token.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ConfirmPasswordChangeInput} input - Challenge token, OTP code and new password.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<ConfirmPasswordChangeOutput>} Observable emitting the change result.
   */
  public confirmPasswordChange(
    input: ConfirmPasswordChangeInput,
    options?: ApiRequestOptions,
  ): Observable<ConfirmPasswordChangeOutput> {
    return this.post<ConfirmPasswordChangeInput, ConfirmPasswordChangeOutput>(
      `${UserProfileService.BASE_PATH}/me/password/confirm`,
      input,
      options,
    );
  }

  /**
   * Method requestEmailChange
   *
   * @description
   * Requests a sign-in email change: verifies the current password, then the
   * backend emails a confirmation link (1 h validity) to the new address and
   * an alert to the current one. Answers 202; a new request replaces any
   * pending one. A wrong current password is a 422, an address that cannot
   * be used a neutral 409.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestEmailChangeInput} input - New address and current password.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<RequestEmailChangeOutput>} Observable emitting the request outcome.
   */
  public requestEmailChange(
    input: RequestEmailChangeInput,
    options?: ApiRequestOptions,
  ): Observable<RequestEmailChangeOutput> {
    return this.post<RequestEmailChangeInput, RequestEmailChangeOutput>(
      `${UserProfileService.BASE_PATH}/me/email-change`,
      input,
      options,
    );
  }

  /**
   * Method cancelEmailChange
   *
   * @description
   * Cancels the pending sign-in email change request. Idempotent: the
   * backend answers 204 whether or not a request was pending.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<void>} Observable completing when the request is cancelled.
   */
  public cancelEmailChange(options?: ApiRequestOptions): Observable<void> {
    return this.delete(`${UserProfileService.BASE_PATH}/me/email-change`, options);
  }
}
