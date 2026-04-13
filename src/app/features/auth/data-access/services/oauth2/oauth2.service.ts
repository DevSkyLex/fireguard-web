import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { HydraApiService } from '@core/services/hydra-api';
import type { UserInfoOutput } from '@features/auth/models';

/**
 * Service OAuth2Service
 * @class OAuth2Service
 * @extends {HydraApiService}
 *
 * @description
 * API service for OAuth2/OpenID Connect operations.
 * Provides access to user profile information via the userinfo endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const oauth2Service = inject(OAuth2Service);
 *
 * // Get user info
 * oauth2Service.userinfo().subscribe(user => {
 *   console.log('User:', user.name, user.email);
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class OAuth2Service extends HydraApiService {
  //#region Constants
  /**
   * Constant BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for all OAuth2 API endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/oauth2';
  //#endregion

  //#region Public Methods
  /**
   * Method userinfo
   *
   * @description
   * Retrieves authenticated user information following the
   * OpenID Connect UserInfo specification (RFC 7662).
   * Returns standard OIDC claims such as sub, name, email, etc.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<UserInfoOutput>} Observable emitting the user information.
   */
  public userinfo(): Observable<UserInfoOutput> {
    return this.getOne<UserInfoOutput>(
      `${OAuth2Service.BASE_PATH}/userinfo`,
    );
  }
  //#endregion
}
