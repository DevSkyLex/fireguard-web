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
