import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';
import type { QueryState } from '../models';

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
 * Use the standalone `PartialStateUpdater` functions from `query-state.utils`
 * with `patchState` to drive transitions:
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
