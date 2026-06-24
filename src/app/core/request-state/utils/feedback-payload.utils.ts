import type { FeedbackEventPayload, FeedbackSeverity } from '../models';

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
  /** Optional short bold title rendered above the message. */
  readonly summary?: string;
  /** Machine-readable error code (HTTP status). Defaults to `null`. */
  readonly code?: string | number | null;
  /** Whether the failed operation may be retried. Defaults to `false`. */
  readonly retryable?: boolean;
  /** Production time (ms). Defaults to `Date.now()`. */
  readonly timestamp?: number;
}

/**
 * Function createFeedbackPayload
 * @function createFeedbackPayload
 *
 * @description
 * Builds a normalized {@link FeedbackEventPayload} for the given severity.
 * Shared base used by the per-severity factories below.
 *
 * @param severity The feedback severity.
 * @param message The already-localized, human-readable message.
 * @param options Optional summary, code, retryable and timestamp overrides.
 *
 * @return A fully-populated `FeedbackEventPayload`.
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
 * @function successFeedback
 *
 * @description
 * Builds a `success` feedback payload, typically dispatched after a mutation
 * succeeds to confirm the action ("Facility created").
 *
 * @param message The already-localized success message.
 * @param summary Optional bold title rendered above the message.
 *
 * @return A `success` `FeedbackEventPayload`.
 */
export function successFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('success', message, { summary });
}

/**
 * Function infoFeedback
 * @function infoFeedback
 *
 * @description
 * Builds an `info` feedback payload for neutral, non-blocking notices.
 *
 * @param message The already-localized info message.
 * @param summary Optional bold title rendered above the message.
 *
 * @return An `info` `FeedbackEventPayload`.
 */
export function infoFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('info', message, { summary });
}

/**
 * Function warnFeedback
 * @function warnFeedback
 *
 * @description
 * Builds a `warn` feedback payload for recoverable, attention-worthy states.
 *
 * @param message The already-localized warning message.
 * @param summary Optional bold title rendered above the message.
 *
 * @return A `warn` `FeedbackEventPayload`.
 */
export function warnFeedback(message: string, summary?: string): FeedbackEventPayload {
  return createFeedbackPayload('warn', message, { summary });
}

/**
 * Function errorFeedback
 * @function errorFeedback
 *
 * @description
 * Builds an `error` feedback payload. Used by `toStoreFailureEventPayload` to
 * map a normalized `StoreError` into a dispatchable feedback event.
 *
 * @param message The already-localized error message.
 * @param options Optional summary, code, retryable and timestamp overrides.
 *
 * @return An `error` `FeedbackEventPayload`.
 */
export function errorFeedback(
  message: string,
  options?: FeedbackPayloadOptions,
): FeedbackEventPayload {
  return createFeedbackPayload('error', message, options);
}

/**
 * Function isFeedbackEventPayload
 * @function isFeedbackEventPayload
 *
 * @description
 * Type guard narrowing an unknown event payload to a `FeedbackEventPayload`.
 * Lets the app-wide feedback listener pick feedback events out of the global
 * event stream without importing any feature event group.
 *
 * @param value The raw event payload to test.
 *
 * @return `true` when `value` is a `FeedbackEventPayload`.
 */
export function isFeedbackEventPayload(value: unknown): value is FeedbackEventPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { feedback?: unknown }).feedback === true &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}
