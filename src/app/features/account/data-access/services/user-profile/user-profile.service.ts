import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { HydraApiService } from '@core/services/hydra-api';
import type {
  ConfirmPasswordChangeInput,
  ConfirmPasswordChangeOutput,
  RequestPasswordChangeInput,
  RequestPasswordChangeOutput,
  UpdateCurrentUserProfileInput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';

/**
 * Service UserProfileService
 * @class UserProfileService
 * @extends {HydraApiService}
 *
 * @description
 * Account-owned API service for retrieving the current authenticated user
 * profile. The backend endpoint resolves the authenticated user identity
 * together with global roles and permissions, while ownership remains with
 * the account feature because it owns current user profile state.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class UserProfileService extends HydraApiService {
  /**
   * Constant BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for the current authenticated user profile resource.
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
   * @param {UpdateCurrentUserProfileInput} input - Profile fields to update.
   * @returns {Observable<UserProfileOutput>} Observable emitting the updated profile.
   */
  public updateCurrentProfile(input: UpdateCurrentUserProfileInput): Observable<UserProfileOutput> {
    return this.patch<UpdateCurrentUserProfileInput, UserProfileOutput>(
      `${UserProfileService.BASE_PATH}/me`,
      input,
    );
  }

  /**
   * Method uploadCurrentAvatar
   *
   * @description
   * Replaces the authenticated user's avatar.
   *
   * @param {Blob} avatar - Avatar image to upload.
   * @param {string} fileName - Original avatar file name.
   * @returns {Observable<UserOutput>} Observable emitting the updated user.
   */
  public uploadCurrentAvatar(avatar: Blob, fileName: string = 'avatar'): Observable<UserOutput> {
    const body = new FormData();
    body.set('avatar', avatar, fileName);

    return this.http
      .put<UserOutput>(this.buildUrl(`${UserProfileService.BASE_PATH}/me/avatar`), body, {
        headers: this.defaultHeaders.delete('Content-Type'),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method requestPasswordChange
   *
   * @description
   * Starts the authenticated password change flow: verifies the current
   * password then sends a one-time code to the user's email address.
   *
   * @param {RequestPasswordChangeInput} input - Current password to verify.
   * @returns {Observable<RequestPasswordChangeOutput>} Observable emitting the OTP challenge details.
   */
  public requestPasswordChange(
    input: RequestPasswordChangeInput,
  ): Observable<RequestPasswordChangeOutput> {
    return this.post<RequestPasswordChangeInput, RequestPasswordChangeOutput>(
      `${UserProfileService.BASE_PATH}/me/password/request`,
      input,
    );
  }

  /**
   * Method confirmPasswordChange
   *
   * @description
   * Completes the authenticated password change flow with the OTP code.
   * On success the backend revokes every active session and OAuth token.
   *
   * @param {ConfirmPasswordChangeInput} input - Challenge token, OTP code and new password.
   * @returns {Observable<ConfirmPasswordChangeOutput>} Observable emitting the change result.
   */
  public confirmPasswordChange(
    input: ConfirmPasswordChangeInput,
  ): Observable<ConfirmPasswordChangeOutput> {
    return this.post<ConfirmPasswordChangeInput, ConfirmPasswordChangeOutput>(
      `${UserProfileService.BASE_PATH}/me/password/confirm`,
      input,
    );
  }
}
