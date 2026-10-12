/**
 * Interface StoreError
 * @interface StoreError
 *
 * @description
 * Normalized error container for async store calls.
 * Always produced via `toStoreError(unknown)` to guarantee a consistent shape.
 *
 * @since 1.0.0
 *
 * @template TError - The raw error type preserved at `error`. Defaults to `unknown`.
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
   * Transport failures and in-progress receipts allow an unchanged retry. Other idempotency
   * failures require review with the original identity, including unknown server outcomes.
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
