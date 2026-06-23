import type { StoreError } from './store-error.type';

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
export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Interface QueryState (internal)
 * @interface QueryState
 *
 * @description
 * Raw state slice managed by `withQueryState`.
 * Members use the `_query` prefix to stay private by convention.
 *
 * Concern-internal: consumed by `withQueryState` and the `query-state`
 * updaters; not part of the public `@core/request-state` surface.
 */
export interface QueryState<TData> {
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
