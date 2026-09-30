import type { FeedbackEventPayload, FeedbackSeverity } from '../../models';

/**
 * Interface FeedbackPayloadOptions
 * @interface FeedbackPayloadOptions
 *
 * @description
 * Optional fields accepted by the feedback payload factories.
 *
 * @since 1.0.0
 */
interface FeedbackPayloadOptions {
  /**
   * Property summary
   * @readonly
   *
   * @description
   * Optional short bold title rendered above the message.
   *
   * @type {string}
   */
  readonly summary?: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Machine-readable error code (HTTP status). Defaults to `null`.
   *
   * @type {string | number | null}
   */
  readonly code?: string | number | null;

  /**
   * Property retryable
   * @readonly
   *
   * @description
   * Whether the failed operation may be retried. Defaults to `false`.
   *
   * @type {boolean}
   */
  readonly retryable?: boolean;

  /**
   * Property timestamp
   * @readonly
   *
   * @description
   * Production time (ms). Defaults to `Date.now()`.
   *
   * @type {number}
   */
  readonly timestamp?: number;
}

/**
 * Function createFeedbackPayload
 *
 * @description
 * Builds a normalized {@link FeedbackEventPayload} for the given severity.
 * Shared base used by the per-severity factories below.
 *
 * @param {FeedbackSeverity} severity The feedback severity.
 * @param {string} message The already-localized, human-readable message.
 * @param {FeedbackPayloadOptions} options Optional summary, code, retryable and timestamp
 *   overrides.
 *
 * @returns {FeedbackEventPayload} A fully-populated `FeedbackEventPayload`.
 *
 * @function createFeedbackPayload
 */
function createFeedbackPayload(
  severity: FeedbackSeverity,
  message: string,
  options?: FeedbackPayloadOptions,
): FeedbackEventPayload {
  return {
    feedback: true,
    severity,
    message,
    summary: options?.summary,
    code: options?.code ?? null,
    retryable: options?.retryable ?? false,
    timestamp: options?.timestamp ?? Date.now(),
  };
}

/**
 * Function successFeedback
 *
 * @description
 * Builds a `success` feedback payload, typically dispatched after a mutation
 * succeeds to confirm the action ("Facility created").
 *
 * @param {string} message The already-localized success message.
 * @param {string} summary Optional bold title rendered above the message.
 *
 * @returns {FeedbackEventPayload} A `success` `FeedbackEventPayload`.
 *
 * @function successFeedback
 */
export function successFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('success', message, { summary });
}

/**
 * Function infoFeedback
 *
 * @description
 * Builds an `info` feedback payload for neutral, non-blocking notices.
 *
 * @param {string} message The already-localized info message.
 * @param {string} summary Optional bold title rendered above the message.
 *
 * @returns {FeedbackEventPayload} An `info` `FeedbackEventPayload`.
 *
 * @function infoFeedback
 */
export function infoFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('info', message, { summary });
}

/**
 * Function warnFeedback
 *
 * @description
 * Builds a `warn` feedback payload for recoverable, attention-worthy states.
 *
 * @param {string} message The already-localized warning message.
 * @param {string} summary Optional bold title rendered above the message.
 *
 * @returns {FeedbackEventPayload} A `warn` `FeedbackEventPayload`.
 *
 * @function warnFeedback
 */
export function warnFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('warn', message, { summary });
}

/**
 * Function errorFeedback
 *
 * @description
 * Builds an `error` feedback payload. Used by `toStoreFailureEventPayload` to
 * map a normalized `StoreError` into a dispatchable feedback event.
 *
 * @param {string} message The already-localized error message.
 * @param {FeedbackPayloadOptions} options Optional summary, code, retryable and timestamp
 *   overrides.
 *
 * @returns {FeedbackEventPayload} An `error` `FeedbackEventPayload`.
 *
 * @function errorFeedback
 */
export function errorFeedback(
  message: string,
  options?: FeedbackPayloadOptions,
): FeedbackEventPayload {
  return createFeedbackPayload('error', message, options);
}

/**
 * Function isFeedbackEventPayload
 *
 * @description
 * Type guard narrowing an unknown event payload to a `FeedbackEventPayload`.
 * Lets the app-wide feedback listener pick feedback events out of the global
 * event stream without importing any feature event group.
 *
 * @param {unknown} value The raw event payload to test.
 *
 * @returns {boolean} `true` when `value` is a `FeedbackEventPayload`.
 *
 * @function isFeedbackEventPayload
 */
export function isFeedbackEventPayload(value: unknown): value is FeedbackEventPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { feedback?: unknown }).feedback === true &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}
