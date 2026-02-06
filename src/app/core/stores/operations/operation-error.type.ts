import type { ApiError } from '@core/models/api';

/**
 * Interface OperationError
 * @interface OperationError
 *
 * @description
 * Normalized error container for operations.
 *
 * @version 1.0.0
 */
export interface OperationError<TError = ApiError> {
  /**
   * Property error
   * @readonly
   *
   * @description
   * Original error object.
   *
   * @since 1.0.0
   *
   * @type {TError}
   */
  readonly error: TError;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Optional user-friendly message.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly message?: string | null;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Optional error code for client-side handling.
   *
   * @since 1.0.0
   *
   * @type {string | number | null | undefined}
   */
  readonly code?: string | number | null;

  /**
   * Property retryable
   * @readonly
   *
   * @description
   * Indicates if the operation can be retried safely.
   *
   * @since 1.0.0
   *
   * @type {boolean | null | undefined}
   */
  readonly retryable?: boolean | null;

  /**
   * Property timestamp
   * @readonly
   *
   * @description
   * Epoch time (ms) when the error occurred.
   *
   * @since 1.0.0
   *
   * @type {number | undefined}
   */
  readonly timestamp?: number;
}
