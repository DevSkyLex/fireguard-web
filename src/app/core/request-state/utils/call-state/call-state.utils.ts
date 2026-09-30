import type { CallState, StoreError } from '../../models';

/**
 * Function idleCallState
 *
 * @description
 * Returns the initial idle call state.
 * Use to seed `withState` fields before any call has been triggered.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @returns {CallState<TData, TError>} A `CallState` in the `idle` phase with `data` and `error` set
 *   to `null`.
 *
 * @function idleCallState
 */
export function idleCallState<TData = null, TError = StoreError>(): CallState<TData, TError> {
  return { status: 'idle', data: null, error: null };
}

/**
 * Function pendingCallState
 *
 * @description
 * Returns a pending (in-flight) call state.
 * Pass the previous `data` value to preserve stale data while a refresh is in flight.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param {TData | null} previous Optional data carried over from the last successful call.
 *
 * @returns {CallState<TData, TError>} A `CallState` in the `pending` phase with `error` set to
 *   `null`.
 *
 * @function pendingCallState
 */
export function pendingCallState<TData = null, TError = StoreError>(
  previous?: TData | null,
): CallState<TData, TError> {
  return { status: 'pending', data: previous ?? null, error: null };
}

/**
 * Function successCallState
 *
 * @description
 * Returns a successful call state carrying the result payload.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param {TData} data The successful result to store in state.
 *
 * @returns {CallState<TData, TError>} A `CallState` in the `success` phase with `error` set to
 *   `null`.
 *
 * @function successCallState
 */
export function successCallState<TData = null, TError = StoreError>(
  data: TData,
): CallState<TData, TError> {
  return { status: 'success', data, error: null };
}

/**
 * Function errorCallState
 *
 * @description
 * Returns a failed call state carrying the normalized error.
 * Pass the previous `data` value to preserve stale data alongside the error.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error. Defaults to `StoreError`.
 *
 * @param {TError} error The normalized error. Use `toStoreError(err)` to normalize.
 * @param {TData | null} previous Optional data carried over from the last successful call.
 *
 * @returns {CallState<TData, TError>} A `CallState` in the `error` phase.
 *
 * @function errorCallState
 */
export function errorCallState<TData = null, TError = StoreError>(
  error: TError,
  previous?: TData | null,
): CallState<TData, TError> {
  return { status: 'error', data: previous ?? null, error };
}

/**
 * Function isCallPending
 *
 * @description
 * Type guard — returns `true` while the call is in flight.
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param {CallState<TData, TError>} state The `CallState` to inspect.
 *
 * @returns {boolean} `true` when `status` is `pending`.
 *
 * @function isCallPending
 */
export function isCallPending<TData, TError>(state: CallState<TData, TError>): boolean {
  return state.status === 'pending';
}

/**
 * Function isCallSuccess
 *
 * @description
 * Type guard — returns `true` after the call succeeded and narrows
 * `data` to `TData` (non-nullable).
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param {CallState<TData, TError>} state The `CallState` to inspect.
 *
 * @returns {boolean} `true` when `status` is `success`, narrowing `data` to `TData`.
 *
 * @function isCallSuccess
 */
export function isCallSuccess<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { data: TData } {
  return state.status === 'success';
}

/**
 * Function isCallError
 *
 * @description
 * Type guard — returns `true` after the call failed and narrows
 * `error` to `TError` (non-nullable).
 *
 * @template TData - Type of the successful payload.
 * @template TError - Type of the error.
 *
 * @param {CallState<TData, TError>} state The `CallState` to inspect.
 *
 * @returns {boolean} `true` when `status` is `error`, narrowing `error` to `TError`.
 *
 * @function isCallError
 */
export function isCallError<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { error: TError } {
  return state.status === 'error';
}
