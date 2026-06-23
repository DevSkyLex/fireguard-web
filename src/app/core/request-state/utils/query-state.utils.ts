import type { PartialStateUpdater } from '@ngrx/signals';
import type { QueryState, StoreError } from '../models';

/**
 * Function setPendingQuery
 * @function setPendingQuery
 *
 * @description
 * Transitions query state to `pending`.
 * Call before triggering the HTTP request.
 *
 * @template TData The type of the successful query result data,
 * inferred from the store's `withQueryState` generic.
 *
 * @return PartialStateUpdater to apply with `patchState`.
 */
export function setPendingQuery<TData>(): PartialStateUpdater<QueryState<TData>> {
  return () => ({
    _queryStatus: 'pending',
    _queryError: null,
  });
}

/**
 * Function setSuccessQuery
 * @function setSuccessQuery
 *
 * @description
 * Transitions query state to `success` and stores the result.
 * Call in `tapResponse.next`.
 *
 * @template TData The type of the successful query result data,
 * inferred from the store's `withQueryState` generic.
 *
 * @param data The successful query result to store in state.
 *
 * @return PartialStateUpdater to apply with `patchState`.
 */
export function setSuccessQuery<TData>(data: TData): PartialStateUpdater<QueryState<TData>> {
  return () => ({
    _queryStatus: 'success',
    _queryData: data,
    _queryError: null,
  });
}

/**
 * Function setErrorQuery
 * @function setErrorQuery
 *
 * @description
 * Transitions query state to `error` and stores the normalized error.
 * Call in `tapResponse.error`.
 *
 * @template TData The type of the successful query result data,
 * inferred from the store's `withQueryState` generic.
 *
 * @param error The error to store in state, typically normalized via `toStoreError`.
 *
 * @return PartialStateUpdater to apply with `patchState`.
 */
export function setErrorQuery<TData>(error: StoreError): PartialStateUpdater<QueryState<TData>> {
  return () => ({
    _queryStatus: 'error',
    _queryError: error,
  });
}

/**
 * Function resetQuery
 * @function resetQuery
 *
 * @description
 * Resets query state to `idle`, clearing
 * data and error.
 *
 * @template TData The type of the successful query result data,
 * inferred from the store's `withQueryState` generic.
 *
 * @return PartialStateUpdater to apply with `patchState`.
 */
export function resetQuery<TData>(): PartialStateUpdater<QueryState<TData>> {
  return () => ({
    _queryStatus: 'idle',
    _queryData: null,
    _queryError: null,
  });
}
