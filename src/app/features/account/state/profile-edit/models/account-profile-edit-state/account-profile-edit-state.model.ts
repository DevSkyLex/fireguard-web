import type { CallState } from '@core/state/request-state';
import type { UserOutput, UserProfileOutput } from '@features/account/models';

/**
 * Interface AccountProfileEditState
 * @interface AccountProfileEditState
 *
 * @description
 * State of the current-user profile edit workflow, containing the request
 * states for profile-field updates and avatar uploads.
 *
 * @since 1.0.0
 */
export interface AccountProfileEditState {
  /**
   * Property saveCallState
   *
   * @description
   * Request state for the profile-field update operation.
   *
   * @type {CallState<UserProfileOutput | null>}
   */
  readonly saveCallState: CallState<UserProfileOutput | null>;

  /**
   * Property avatarCallState
   *
   * @description
   * Request state for the avatar upload operation.
   *
   * @type {CallState<UserOutput | null>}
   */
  readonly avatarCallState: CallState<UserOutput | null>;
}
