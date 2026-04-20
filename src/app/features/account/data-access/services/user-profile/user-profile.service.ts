import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { HydraApiService } from '@core/services/hydra-api';
import type { UserProfileOutput } from '@features/account/models';

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
}
