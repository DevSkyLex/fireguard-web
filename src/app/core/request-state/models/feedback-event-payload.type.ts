/**
 * Type FeedbackSeverity
 * @typedef FeedbackSeverity
 *
 * @description
 * Severity of a user-facing feedback message. Mirrors the PrimeNG toast
 * severities so a `FeedbackEventPayload` can be forwarded to the toast layer
 * without translation.
 *
 * @since 1.0.0
 */
export type FeedbackSeverity = 'success' | 'info' | 'warn' | 'error';

/**
 * Interface FeedbackEventPayload
 * @interface FeedbackEventPayload
 *
 * @description
 * Serializable payload describing a single user-facing feedback message
 * (success, info, warning or error). It is dispatched as a store domain event
 * and consumed by the app-wide feedback listener, which turns it into a toast.
 *
 * The `feedback` discriminator lets the central listener pick feedback events
 * out of the global event stream without importing any feature event group,
 * keeping `core` independent of `features`.
 *
 * It is a superset of the legacy failure payload: `message`, `code`,
 * `retryable` and `timestamp` are preserved so existing failure consumers keep
 * working unchanged.
 *
 * @since 1.0.0
 */
export interface FeedbackEventPayload {
  //#region Properties

  /**
   * Property feedback
   *
   * @description
   * Discriminator marking this payload as a user-facing feedback message.
   * Always `true`; used by `isFeedbackEventPayload` to narrow the global
   * event stream.
   *
   * @type {true}
   */
  readonly feedback: true;

  /**
   * Property severity
   *
   * @description
   * Feedback severity, forwarded as-is to the toast layer.
   *
   * @type {FeedbackSeverity}
   */
  readonly severity: FeedbackSeverity;

  /**
   * Property message
   *
   * @description
   * Human-readable, already-localized message, guaranteed non-null.
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property summary
   *
   * @description
   * Optional short title shown in bold above the message. When omitted, the
   * toast uses `message` as its single bold line.
   *
   * @type {string | undefined}
   */
  readonly summary?: string;

  /**
   * Property code
   *
   * @description
   * Machine-readable error code forwarded from the source `StoreError`
   * (e.g. HTTP status), or `null` for non-error feedback.
   *
   * @type {string | number | null}
   */
  readonly code: string | number | null;

  /**
   * Property retryable
   *
   * @description
   * Whether the operation that produced this feedback may be safely retried.
   * Always `false` for non-error feedback.
   *
   * @type {boolean}
   */
  readonly retryable: boolean;

  /**
   * Property timestamp
   *
   * @description
   * Unix timestamp (ms) at which the feedback was produced. Used by the toast
   * layer to render a relative time ("now", "1m", …).
   *
   * @type {number}
   */
  readonly timestamp: number;

  //#endregion
}

/**
 * Type StoreFailureEventPayload
 * @typedef StoreFailureEventPayload
 *
 * @description
 * Backward-compatible alias of {@link FeedbackEventPayload}. Failure events
 * always carry `severity: 'error'`. Kept so the existing 25 store event groups
 * that reference `StoreFailureEventPayload` continue to compile unchanged.
 *
 * @since 1.0.0
 */
export type StoreFailureEventPayload = FeedbackEventPayload;
