import type { StoreError } from './store-error';

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

/**
 * Function idleCallState
 * @function idleCallState
 *
 * @description
 * Returns the initial idle call state.
 * Use to seed `withState` fields before any call has been triggered.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @return A `CallState` in the `idle` phase with `data` and `error` set to `null`.
 */
export function idleCallState<TData = null, TError = StoreError>(): CallState<TData, TError> {
  return { status: 'idle', data: null, error: null };
}

/**
 * Function pendingCallState
 * @function pendingCallState
 *
 * @description
 * Returns a pending (in-flight) call state.
 * Pass the previous `data` value to preserve stale data while a refresh is in flight.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param previous Optional data carried over from the last successful call.
 *
 * @return A `CallState` in the `pending` phase with `error` set to `null`.
 */
export function pendingCallState<TData = null, TError = StoreError>(
  previous?: TData | null,
): CallState<TData, TError> {
  return { status: 'pending', data: previous ?? null, error: null };
}

/**
 * Function successCallState
 * @function successCallState
 *
 * @description
 * Returns a successful call state carrying the result payload.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param data The successful result to store in state.
 *
 * @return A `CallState` in the `success` phase with `error` set to `null`.
 */
export function successCallState<TData = null, TError = StoreError>(
  data: TData,
): CallState<TData, TError> {
  return { status: 'success', data, error: null };
}

/**
 * Function errorCallState
 * @function errorCallState
 *
 * @description
 * Returns a failed call state carrying the normalized error.
 * Pass the previous `data` value to preserve stale data alongside the error.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param error The normalized error. Use `toStoreError(err)` to normalize.
 * @param previous Optional data carried over from the last successful call.
 *
 * @return A `CallState` in the `error` phase.
 */
export function errorCallState<TData = null, TError = StoreError>(
  error: TError,
  previous?: TData | null,
): CallState<TData, TError> {
  return { status: 'error', data: previous ?? null, error };
}

/**
 * Function isCallPending
 * @function isCallPending
 *
 * @description
 * Type guard — returns `true` while the call is in flight.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param state The `CallState` to inspect.
 *
 * @return `true` when `status` is `pending`.
 */
export function isCallPending<TData, TError>(state: CallState<TData, TError>): boolean {
  return state.status === 'pending';
}

/**
 * Function isCallSuccess
 * @function isCallSuccess
 *
 * @description
 * Type guard — returns `true` after the call succeeded and narrows
 * `data` to `TData` (non-nullable).
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param state The `CallState` to inspect.
 *
 * @return `true` when `status` is `success`, narrowing `data` to `TData`.
 */
export function isCallSuccess<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { data: TData } {
  return state.status === 'success';
}

/**
 * Function isCallError
 * @function isCallError
 *
 * @description
 * Type guard — returns `true` after the call failed and narrows
 * `error` to `TError` (non-nullable).
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param state The `CallState` to inspect.
 *
 * @return `true` when `status` is `error`, narrowing `error` to `TError`.
 */
export function isCallError<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { error: TError } {
  return state.status === 'error';
}
