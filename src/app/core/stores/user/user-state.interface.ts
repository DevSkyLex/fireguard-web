import type { UserInfoOutput } from '@core/models/oauth2';
import type { Operation } from '@core/stores/operations';

/**
 * Interface UserState
 * @interface UserState
 *
 * @description
 * State interface for the user store.
 * Manages current user profile information.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserState {
  //#region User Data
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Current user profile information from OIDC userinfo endpoint.
   * Null when not loaded or user is not authenticated.
   *
   * @since 1.0.0
   *
   * @type {UserInfoOutput | null}
   */
  readonly profile: UserInfoOutput | null;
  //#endregion

  //#region Operations
  /**
   * Property loadOperation
   * @readonly
   *
   * @description
   * Async operation state for loading user profile.
   *
   * @since 1.0.0
   *
   * @type {Operation<UserInfoOutput, unknown>}
   */
  readonly loadOperation: Operation<UserInfoOutput, unknown>;
  //#endregion
}
