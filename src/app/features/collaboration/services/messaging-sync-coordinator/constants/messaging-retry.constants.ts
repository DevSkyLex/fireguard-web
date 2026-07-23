/**
 * Constant MESSAGING_RETRY_BASE_DELAY_MS
 *
 * @description
 * First delay before re-attempting a deferred queue, doubled each pass.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const MESSAGING_RETRY_BASE_DELAY_MS: number = 2_000;

/**
 * Constant MESSAGING_RETRY_MAX_DELAY_MS
 *
 * @description
 * Ceiling for the retry delay.
 *
 * There is no attempt limit: a queued message that stops being retried is a
 * message silently lost, which is exactly what the outbox exists to prevent.
 * Work that genuinely cannot succeed is marked failed by the sync service and
 * leaves the retry loop that way, not by being counted out.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const MESSAGING_RETRY_MAX_DELAY_MS: number = 60_000;
