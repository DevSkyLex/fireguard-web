import { computed, type Signal } from '@angular/core';
import {
  type EmptyFeatureResult,
  type Prettify,
  type SignalStoreFeature,
  signalStoreFeature,
  withComputed,
  withState,
} from '@ngrx/signals';
import type { QueryState, StoreError } from '../models';

/**
 * Type QueryStateFeatureResult
 * @type QueryStateFeatureResult
 * @description Query state composition contract with plain public signals and no commands.
 * @template TData - The successful query payload.
 */
type QueryStateFeatureResult<TData> = {
  state: Prettify<QueryState<TData>>;
  props: {
    isQueryLoading: Signal<boolean>;
    isQueryLoaded: Signal<boolean>;
    queryHasError: Signal<boolean>;
    queryData: Signal<TData | null>;
    queryError: Signal<StoreError | null>;
  };
  methods: EmptyFeatureResult['methods'];
};

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
 * Public data and error projections remain plain nullable signals,
 * independent of NgRx's internal deep-signal representation.
 *
 * @template TData The type of the successful query result data.
 *
 * @returns {SignalStoreFeature<EmptyFeatureResult, QueryStateFeatureResult<TData>>} Query feature to apply when creating the store.
 */
export function withQueryState<TData>(): SignalStoreFeature<
  EmptyFeatureResult,
  QueryStateFeatureResult<TData>
> {
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
      queryData: computed<TData | null>(() => _queryData()),
      queryError: computed<StoreError | null>(() => _queryError()),
    })),
  );
}
