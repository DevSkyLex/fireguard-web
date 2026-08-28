import type { CallState } from '@core/request-state';
import type { UserProfileOutput } from '@features/account/models';

/**
 * Interface AccountDeactivationState
 * @interface AccountDeactivationState
 *
 * @description
 * State of the self-service account deactivation workflow: the request state
 * of the single, terminal API operation.
 *
 * @since 1.0.0
 */
export interface AccountDeactivationState {
  /**
   * Property deactivateCallState
   *
   * @description
   * Request state of the account deactivation operation.
   *
   * @type {CallState<UserProfileOutput | null>}
   */
  readonly deactivateCallState: CallState<UserProfileOutput | null>;
}
