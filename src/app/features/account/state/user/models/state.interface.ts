import type { CallState } from '@core/request-state';
import type { UserProfileOutput } from '@features/account/models';

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
   * Current user profile information from the account-owned `/api/me` endpoint.
   * Null when not loaded or user is not authenticated.
   *
   * @since 1.0.0
   *
   * @type {UserProfileOutput | null}
   */
  readonly profile: UserProfileOutput | null;
  //#endregion

  //#region Call States
  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Async call state for loading user profile.
   *
   * @since 1.0.0
   *
   * @type {CallState<UserProfileOutput>}
   */
  readonly loadCallState: CallState<UserProfileOutput>;
  //#endregion
}
