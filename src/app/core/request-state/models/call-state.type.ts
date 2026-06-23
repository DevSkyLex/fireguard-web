import type { StoreError } from './store-error.type';

/**
 * Type CallStatus
 * @type CallStatus
 *
 * @description
 * Represents the four-phase lifecycle of a single async store call:
 * - `idle`: no call has been triggered yet.
 * - `pending`: a call is in flight.
 * - `success`: the call completed and data is available.
 * - `error`: the call failed and a normalized error is stored.
 *
 * @since 1.0.0
 */
export type CallStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Interface CallState
 * @interface CallState
 *
 * @description
 * Generic async call state for a single store operation.
 *
 * Use named `CallState` fields directly in `withState` for stores with
 * multiple independent async operations (CRUD, workflows). For stores
 * with exactly ONE primary query concern, prefer `withQueryState` instead.
 *
 * @template TData - Type of the successful payload. Defaults to `null` for
 * command-only calls that return no data.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @example
 * // State interface for a multi-action store
 * interface UsersState {
 *   createCallState: CallState<UserOutput>;
 *   updateCallState: CallState;
 *   deleteCallState: CallState;
 *   listCallState: CallState;
 * }
 *
 * @since 1.0.0
 */
export interface CallState<TData = null, TError = StoreError> {
  //#region Properties

  /**
   * Property status
   *
   * @description
   * Current lifecycle phase of the call.
   *
   * @type {CallStatus}
   */
  readonly status: CallStatus;

  /**
   * Property data
   *
   * @description
   * Payload from the last successful call, or `null` when no success
   * has occurred yet. Preserved across `pendingCallState(previous)`
   * and `errorCallState(error, previous)` when the caller passes
   * the previous value.
   *
   * @type {TData | null}
   */
  readonly data: TData | null;

  /**
   * Property error
   *
   * @description
   * Normalized error from the last failed call, or `null` when the
   * call has not errored. Always `null` on `idle`, `pending`,
   * and `success`.
   *
   * @type {TError | null}
   */
  readonly error: TError | null;

  //#endregion
}
