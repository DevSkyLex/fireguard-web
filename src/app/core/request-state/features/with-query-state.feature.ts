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
 *
 * @description
 * Query state composition contract with plain public signals and no commands.
 *
 * @template TData - The successful query payload.
 *
 * @type QueryStateFeatureResult
 */
type QueryStateFeatureResult<TData> = {
  /**
   * Property state
   *
   * @description
   * Internal request lifecycle state managed by the query feature.
   *
   * @access public
   * @since unreleased
   *
   * @type {Prettify<QueryState<TData>>}
   */
  state: Prettify<QueryState<TData>>;

  /**
   * Property props
   *
   * @description
   * Computed store signals exposing query lifecycle, result data and normalized failure.
   *
   * @access public
   * @since unreleased
   *
   * @type {QueryStateFeatureResult<TData>['props']}
   */
  props: {
    isQueryLoading: Signal<boolean>;
    isQueryLoaded: Signal<boolean>;
    queryHasError: Signal<boolean>;
    queryData: Signal<TData | null>;
    queryError: Signal<StoreError | null>;
  };

  /**
   * Property methods
   *
   * @description
   * Preserves the base store's methods; query transitions are driven by the exported state updater
   * functions.
   *
   * @access public
   * @since unreleased
   *
   * @type {EmptyFeatureResult['methods']}
   */
  methods: EmptyFeatureResult['methods'];
};

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
 *
 * @function withQueryState
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
