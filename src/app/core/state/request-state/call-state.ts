import type { StoreError } from './store-error';

/**
 * Type CallStatus
 *
 * @description
 * Lifecycle status for an async store call.
 * Replaces the legacy `OperationStatus` type.
 */
export type CallStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Interface CallState
 *
 * @description
 * Generic async call state for a single store operation.
 * Replaces the legacy `Operation<TData, TError>` discriminated union.
 *
 * Prefer `withQueryState` for stores that have exactly one primary query concern.
 * Use named `CallState` fields directly in `withState` for multi-call stores (CRUD).
 *
 * @example
 * // State interface for a multi-call store
 * interface UsersState {
 *   createCallState: CallState;
 *   updateCallState: CallState;
 *   deleteCallState: CallState<UserOutput>;
 * }
 */
export interface CallState<TData = null, TError = StoreError> {
  readonly status: CallStatus;
  readonly data: TData | null;
  readonly error: TError | null;
}

/**
 * Function idleCallState
 *
 * @description
 * Returns the initial idle call state. Use to initialize state fields.
 * Replaces `createIdleOperation()`.
 */
export function idleCallState<TData = null, TError = StoreError>(): CallState<TData, TError> {
  return { status: 'idle', data: null, error: null };
}

/**
 * Function pendingCallState
 *
 * @description
 * Returns a pending (in-flight) call state, optionally preserving
 * cached data from a previous success.
 * Replaces `createLoadingOperation(previousData)`.
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
 * Replaces `createSuccessOperation(data)`.
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
 * Optionally preserves cached data from a previous success.
 * Replaces `createErrorOperation(error, previousData)`.
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
 * @description Type guard — true while the call is in-flight.
 */
export function isCallPending<TData, TError>(state: CallState<TData, TError>): boolean {
  return state.status === 'pending';
}

/**
 * Function isCallSuccess
 *
 * @description Type guard — true after a successful call.
 */
export function isCallSuccess<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { data: TData } {
  return state.status === 'success';
}

/**
 * Function isCallError
 *
 * @description Type guard — true after a failed call.
 */
export function isCallError<TData, TError>(
  state: CallState<TData, TError>,
): state is CallState<TData, TError> & { error: TError } {
  return state.status === 'error';
}
