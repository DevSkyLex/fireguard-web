import { isApiError, type ApiError } from '@core/models/api';
import type { OperationError } from './operation-error.type';
import type { OperationMeta } from './operation-meta.type';
import type {
  Operation,
  OperationFailed,
  OperationIdle,
  OperationLoading,
  OperationSuccess,
} from './operation.type';

/**
 * Function createIdleOperation
 *
 * @description
 * Creates an idle operation state.
 *
 * @since 1.0.0
 *
 * @returns {OperationIdle<TData, TError, TParams>}
 */
export function createIdleOperation<TData, TError = ApiError, TParams = never>(
  meta: OperationMeta<TParams> = {},
): OperationIdle<TData, TError, TParams> {
  return {
    status: 'idle',
    data: null,
    error: null,
    ...meta,
  };
}

/**
 * Function createLoadingOperation
 *
 * @description
 * Creates a loading operation state.
 *
 * @since 1.0.0
 *
 * @param {TData | null} data - Optional cached data from a previous success.
 * @param {OperationMeta<TParams>} meta - Operation metadata.
 *
 * @returns {OperationLoading<TData, TError, TParams>}
 */
export function createLoadingOperation<TData, TError = ApiError, TParams = never>(
  data: TData | null,
  meta: OperationMeta<TParams> = {},
): OperationLoading<TData, TError, TParams> {
  return {
    status: 'loading',
    data: data,
    error: null,
    ...meta,
  };
}

/**
 * Function createSuccessOperation
 *
 * @description
 * Creates a success operation state.
 *
 * @since 1.0.0
 *
 * @param {TData} data - Result data for successful operations.
 * @param {OperationMeta<TParams>} meta - Operation metadata.
 *
 * @returns {OperationSuccess<TData, TError, TParams>}
 */
export function createSuccessOperation<TData, TError = ApiError, TParams = never>(
  data: TData,
  meta: OperationMeta<TParams> = {},
): OperationSuccess<TData, TError, TParams> {
  return {
    status: 'success',
    data: data,
    error: null,
    ...meta,
  };
}

/**
 * Function createErrorOperation
 *
 * @description
 * Creates an error operation state.
 *
 * @since 1.0.0
 *
 * @param {OperationError<TError>} error - Error information for failed operations.
 * @param {TData | null} data - Optional cached data from a previous success.
 * @param {OperationMeta<TParams>} meta - Operation metadata.
 *
 * @returns {OperationFailed<TData, TError, TParams>}
 */
export function createErrorOperation<TData, TError = ApiError, TParams = never>(
  error: OperationError<TError>,
  data: TData | null,
  meta: OperationMeta<TParams> = {},
): OperationFailed<TData, TError, TParams> {
  return {
    status: 'error',
    data: data,
    error: error,
    ...meta,
  };
}

/**
 * Function isOperationSuccess
 *
 * @description
 * Type guard for success operations.
 *
 * @since 1.0.0
 *
 * @param {Operation<TData, TError, TParams>} operation - Operation to check.
 *
 * @returns {boolean}
 */
export function isOperationSuccess<TData, TError = ApiError, TParams = never>(
  operation: Operation<TData, TError, TParams>,
): operation is OperationSuccess<TData, TError, TParams> {
  return operation.status === 'success';
}

/**
 * Function isOperationError
 *
 * @description
 * Type guard for error operations.
 *
 * @since 1.0.0
 *
 * @param {Operation<TData, TError, TParams>} operation - Operation to check.
 *
 * @returns {boolean}
 */
export function isOperationError<TData, TError = ApiError, TParams = never>(
  operation: Operation<TData, TError, TParams>,
): operation is OperationFailed<TData, TError, TParams> {
  return operation.status === 'error';
}

/**
 * Function createOperationErrorFromUnknown
 *
 * @description
 * Creates an OperationError from an unknown error.
 * Preserves ApiError if received, otherwise wraps the original error.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - The error to wrap.
 *
 * @returns {OperationError<unknown>} Operation error with original error preserved.
 */
export function createOperationErrorFromUnknown(error: unknown): OperationError<unknown> {
  if (isApiError(error)) {
    return {
      error: error,
      message: error.detail,
      code: error.status,
      retryable: error.status >= 500,
      timestamp: Date.now(),
    };
  }

  return {
    error: error,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: null,
    retryable: false,
    timestamp: Date.now(),
  };
}
