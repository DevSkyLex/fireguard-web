import type { ApiError } from '@core/models/api';
import type { OperationError } from './operation-error.type';
import type { OperationMeta } from './operation-meta.type';

/**
 * Interface OperationIdle
 * @interface OperationIdle
 *
 * @description
 * Operation state when nothing has been triggered yet.
 *
 * @since 1.0.0
 */
export interface OperationIdle<TData, TError = ApiError, TParams = never>
  extends OperationMeta<TParams> {
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current operation status.
   *
   * @since 1.0.0
   *
   * @type {'idle'}
   */
  readonly status: 'idle';

  /**
   * Property data
   * @readonly
   *
   * @description
   * No data is available before the first successful run.
   *
   * @since 1.0.0
   *
   * @type {null}
   */
  readonly data: null;

  /**
   * Property error
   * @readonly
   *
   * @description
   * No error is available before the first failure.
   *
   * @since 1.0.0
   *
   * @type {null}
   */
  readonly error: null;
}

/**
 * Interface OperationLoading
 * @interface OperationLoading
 *
 * @description
 * Operation state while a request is in progress.
 *
 * @since 1.0.0
 */
export interface OperationLoading<TData, TError = ApiError, TParams = never>
  extends OperationMeta<TParams> {
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current operation status.
   *
   * @since 1.0.0
   *
   * @type {'loading'}
   */
  readonly status: 'loading';

  /**
   * Property data
   * @readonly
   *
   * @description
   * Optional cached data from a previous success.
   *
   * @since 1.0.0
   *
   * @type {TData | null}
   */
  readonly data: TData | null;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Error is cleared when a new operation starts.
   *
   * @since 1.0.0
   *
   * @type {null}
   */
  readonly error: null;
}

/**
 * Interface OperationSuccess
 * @interface OperationSuccess
 *
 * @description
 * Operation state after a successful response.
 *
 * @since 1.0.0
 */
export interface OperationSuccess<TData, TError = ApiError, TParams = never>
  extends OperationMeta<TParams> {
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current operation status.
   *
   * @since 1.0.0
   *
   * @type {'success'}
   */
  readonly status: 'success';

  /**
   * Property data
   * @readonly
   *
   * @description
   * Result data for successful operations.
   *
   * @since 1.0.0
   *
   * @type {TData}
   */
  readonly data: TData;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Error is cleared on success.
   *
   * @since 1.0.0
   *
   * @type {null}
   */
  readonly error: null;
}

/**
 * Interface OperationFailed
 * @interface OperationFailed
 *
 * @description
 * Operation state after a failed response.
 *
 * @since 1.0.0
 */
export interface OperationFailed<TData, TError = ApiError, TParams = never>
  extends OperationMeta<TParams> {
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current operation status.
   *
   * @since 1.0.0
   *
   * @type {'error'}
   */
  readonly status: 'error';

  /**
   * Property data
   * @readonly
   *
   * @description
   * Optional cached data from a previous success.
   *
   * @since 1.0.0
   *
   * @type {TData | null}
   */
  readonly data: TData | null;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Error information for failed operations.
   *
   * @since 1.0.0
   *
   * @type {OperationError<TError>}
   */
  readonly error: OperationError<TError>;
}

/**
 * Type Operation
 * @type Operation
 *
 * @description
 * Discriminated union for operation states.
 *
 * @since 1.0.0
 */
export type Operation<TData, TError = ApiError, TParams = never> =
  | OperationIdle<TData, TError, TParams>
  | OperationLoading<TData, TError, TParams>
  | OperationSuccess<TData, TError, TParams>
  | OperationFailed<TData, TError, TParams>;
