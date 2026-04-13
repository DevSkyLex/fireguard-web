import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState, type PartialStateUpdater } from '@ngrx/signals';
import type { StoreError } from './store-error';

/**
 * Type QueryStatus
 * @type QueryStatus
 *
 * @description
 * Represents the status of a query operation in the store.
 * - 'idle': No query has been made yet.
 * - 'pending': A query is currently in progress.
 * - 'success': The query completed successfully and data is available.
 * - 'error': The query failed and an error is available.
 */
export type QueryStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error';

/**
 * Interface QueryState (internal)
 * @interface QueryState
 *
 * @description
 * Raw state slice managed by `withQueryState`.
 * Members use the `_query` prefix to stay private by convention.
 */
interface QueryState<TData> {
  //#region Properties
  /**
   * Property _queryStatus
   *
   * @description
   * Current status of the query, used to derive
   * loading and error states.
   *
   * @type {QueryStatus}
   */
  _queryStatus: QueryStatus;

  /**
   * Property _queryError
   * @description
   *
   * Holds the error from a failed query, if any. Should be set
   * when `_queryStatus` is 'error' and null otherwise.
   *
   * @type {StoreError | null}
   */
  _queryError: StoreError | null;

  /**
   * Property _queryData
   *
   * @description
   * Holds the successful result of the query, if any. Should be set
   * when `_queryStatus` is 'success' and null otherwise.
   *
   * The type is generic to allow flexibility across different stores.
   *
   * @type {TData | null}
   */
  _queryData: TData | null;
  //#endregion
}

/**
 * Function withQueryState
 * @function withQueryState
 *
 * @description
 * NgRx SignalStore custom feature for stores that have exactly ONE primary
 * query concern (e.g., loading a single resource, a chart dataset, or a
 * simple list that is not entity-backed).
 *
 * Provides:
 * - private state: `_queryStatus`, `_queryError`, `_queryData`
 * - public computed: `isQueryLoading`, `isQueryLoaded`, `queryHasError`,
 *   `queryData`, `queryError`
 *
 * Use the standalone `PartialStateUpdater` functions below with `patchState`
 * to drive transitions:
 * ```typescript
 * patchState(store, setPendingQuery());
 * patchState(store, setSuccessQuery(data));
 * patchState(store, setErrorQuery(toStoreError(err)));
 * patchState(store, resetQuery());
 * ```
 *
 * For stores with multiple independent query/command calls, declare
 * named `CallState` fields manually via `withState` instead.
 *
 * @template TData The type of the successful query result data.
 *
 * @return SignalStoreFeature to apply when creating the store.
 */
export function withQueryState<TData>() {
  return signalStoreFeature(
    withState<QueryState<TData>>({
      _queryStatus: 'idle',
      _queryError: null,
      _queryData: null,
    }),
    withComputed(({ _queryStatus, _queryError, _queryData }) => ({
      isQueryLoading: computed(() => _queryStatus() === 'pending'),
      isQueryLoaded: computed(() => _queryStatus() === 'success'),
      queryHasError: computed(() => _queryStatus() === 'error'),
      queryData: computed(() => _queryData()),
      queryError: computed(() => _queryError()),
    })),
  );
}

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
    _queryError: null
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
    _queryError: null
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
    _queryError: error
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
    _queryError: null
  });
}
