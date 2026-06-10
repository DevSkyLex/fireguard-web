import type { CallState } from '@core/state/request-state';
import type {
  ConfirmPasswordChangeOutput,
  RequestPasswordChangeOutput,
} from '@features/account/models';

/**
 * Type AccountPasswordChangeStep
 *
 * @description
 * Current step of the authenticated password change workflow.
 *
 * @since 1.0.0
 */
export type AccountPasswordChangeStep = 'request' | 'verify' | 'success';

/**
 * Interface AccountPasswordChangeState
 * @interface AccountPasswordChangeState
 *
 * @description
 * State of the authenticated password change workflow: the active step,
 * the OTP challenge returned by the request step and the request states
 * of both API operations.
 *
 * @since 1.0.0
 */
export interface AccountPasswordChangeState {
  /**
   * Property step
   *
   * @description
   * Active workflow step.
   *
   * @type {AccountPasswordChangeStep}
   */
  readonly step: AccountPasswordChangeStep;

  /**
   * Property challenge
   *
   * @description
   * OTP challenge details returned by the request step.
   *
   * @type {RequestPasswordChangeOutput | null}
   */
  readonly challenge: RequestPasswordChangeOutput | null;

  /**
   * Property requestCallState
   *
   * @description
   * Request state of the password change request operation.
   *
   * @type {CallState<RequestPasswordChangeOutput | null>}
   */
  readonly requestCallState: CallState<RequestPasswordChangeOutput | null>;

  /**
   * Property confirmCallState
   *
   * @description
   * Request state of the password change confirm operation.
   *
   * @type {CallState<ConfirmPasswordChangeOutput | null>}
   */
  readonly confirmCallState: CallState<ConfirmPasswordChangeOutput | null>;
}
