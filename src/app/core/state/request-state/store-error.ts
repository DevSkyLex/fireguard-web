import { isApiError } from '@core/utils';

/**
 * Interface StoreError
 * @interface StoreError
 *
 * @description
 * Normalized error container for async store calls.
 * Always produced via `toStoreError(unknown)` to guarantee a consistent shape.
 *
 * @template TError - The raw error type preserved at `error`. Defaults to `unknown`.
 *
 * @since 1.0.0
 */
export interface StoreError<TError = unknown> {
  //#region Properties

  /**
   * Property error
   *
   * @description
   * The original, raw error value as received from the thrown
   * exception or rejected observable.
   *
   * @type {TError}
   */
  readonly error: TError;

  /**
   * Property message
   *
   * @description
   * Human-readable error message extracted from the raw error,
   * or `null` when no message could be determined.
   *
   * @type {string | null}
   */
  readonly message: string | null;

  /**
   * Property code
   *
   * @description
   * Machine-readable error code (e.g. HTTP status code), or `null`
   * when the error is not API-originated.
   *
   * @type {string | number | null}
   */
  readonly code: string | number | null;

  /**
   * Property retryable
   *
   * @description
   * Whether the caller may safely retry the failed operation.
   * `true` for server errors (5xx), `false` for client errors
   * and non-HTTP failures.
   *
   * @type {boolean}
   */
  readonly retryable: boolean;

  /**
   * Property timestamp
   *
   * @description
   * Unix timestamp (ms) at which the error was normalized.
   * Useful for deduplication and staleness checks.
   *
   * @type {number}
   */
  readonly timestamp: number;

  //#endregion
}

/**
 * Interface StoreFailureEventPayload
 * @interface StoreFailureEventPayload
 *
 * @description
 * Serializable payload dispatched as a store domain failure event.
 * Derived from `StoreError` via `toStoreFailureEventPayload`.
 * Does not carry the raw error to keep events serializable.
 *
 * @since 1.0.0
 */
export interface StoreFailureEventPayload {
  //#region Properties

  /**
   * Property message
   *
   * @description
   * Human-readable error message, guaranteed non-null
   * (falls back to the `fallbackMessage` argument).
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property code
   *
   * @description
   * Machine-readable error code forwarded from the source `StoreError`,
   * or `null` when not available.
   *
   * @type {string | number | null}
   */
  readonly code: string | number | null;

  /**
   * Property retryable
   *
   * @description
   * Whether the operation that failed may be safely retried.
   *
   * @type {boolean}
   */
  readonly retryable: boolean;

  /**
   * Property timestamp
   *
   * @description
   * Unix timestamp (ms) forwarded from the source `StoreError`.
   *
   * @type {number}
   */
  readonly timestamp: number;

  //#endregion
}

/**
 * Function toStoreError
 * @function toStoreError
 *
 * @description
 * Normalizes any unknown thrown value into a `StoreError`.
 * Extracts structured details from `ApiError` instances when present;
 * falls back to the `Error` message or a generic string otherwise.
 *
 * @param error The raw thrown value caught in a `tapResponse.error` callback.
 *
 * @return A normalized `StoreError` ready to store in call state.
 */
export function toStoreError(error: unknown): StoreError {
  if (isApiError(error)) {
    return {
      error,
      message: error.detail,
      code: error.status,
      retryable: error.status >= 500,
      timestamp: Date.now(),
    };
  }

  return {
    error,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: null,
    retryable: false,
    timestamp: Date.now(),
  };
}

/**
 * Function toStoreFailureEventPayload
 * @function toStoreFailureEventPayload
 *
 * @description
 * Maps a `StoreError` to a serializable `StoreFailureEventPayload`
 * for dispatch as a NgRx store domain event.
 *
 * @param error The normalized `StoreError` to convert.
 * @param fallbackMessage Human-readable message to use when `error.message` is `null`.
 *
 * @return A `StoreFailureEventPayload` ready to dispatch.
 */
export function toStoreFailureEventPayload(
  error: StoreError,
  fallbackMessage: string,
): StoreFailureEventPayload {
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? null,
    retryable: error.retryable ?? false,
    timestamp: error.timestamp ?? Date.now(),
  };
}
