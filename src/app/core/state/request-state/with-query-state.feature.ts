import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState, type PartialStateUpdater } from '@ngrx/signals';
import type { StoreError } from './store-error';

/**
 * Interface QueryState (internal)
 *
 * @description
 * Raw state slice managed by `withQueryState`.
 * Members use the `_query` prefix to stay private by convention.
 */
interface QueryState<TData> {
  _queryStatus: 'idle' | 'pending' | 'success' | 'error';
  _queryError: StoreError | null;
  _queryData: TData | null;
}

/**
 * Function withQueryState
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
 *
 * @description
 * Transitions query state to `pending`.
 * Call before triggering the HTTP request.
 */
export function setPendingQuery<TData>(): PartialStateUpdater<QueryState<TData>> {
  return () => ({ _queryStatus: 'pending', _queryError: null });
}

/**
 * Function setSuccessQuery
 *
 * @description
 * Transitions query state to `success` and stores the result.
 * Call in `tapResponse.next`.
 */
export function setSuccessQuery<TData>(data: TData): PartialStateUpdater<QueryState<TData>> {
  return () => ({ _queryStatus: 'success', _queryData: data, _queryError: null });
}

/**
 * Function setErrorQuery
 *
 * @description
 * Transitions query state to `error` and stores the normalized error.
 * Call in `tapResponse.error`.
 */
export function setErrorQuery<TData>(error: StoreError): PartialStateUpdater<QueryState<TData>> {
  return () => ({ _queryStatus: 'error', _queryError: error });
}

/**
 * Function resetQuery
 *
 * @description
 * Resets query state to `idle`, clearing data and error.
 */
export function resetQuery<TData>(): PartialStateUpdater<QueryState<TData>> {
  return () => ({ _queryStatus: 'idle', _queryData: null, _queryError: null });
}
