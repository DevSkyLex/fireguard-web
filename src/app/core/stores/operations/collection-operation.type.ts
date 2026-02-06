import type { ApiError } from '@core/models/api';
import type { Operation } from './operation.type';

/**
 * Type CollectionOperation
 * @type CollectionOperation
 *
 * @description
 * Operation state container for list results.
 *
 * @since 1.0.0
 */
export type CollectionOperation<TItem, TError = ApiError, TParams = never> =
  Operation<ReadonlyArray<TItem>, TError, TParams> & {
    /**
     * Property total
     * @readonly
     *
     * @description
     * Optional total count for paginated collections.
     *
     * @since 1.0.0
     *
     * @type {number | null | undefined}
     */
    readonly total?: number | null;
  };
