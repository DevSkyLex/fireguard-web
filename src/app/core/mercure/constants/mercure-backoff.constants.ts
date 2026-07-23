/**
 * Constant MERCURE_RECONNECT_BASE_DELAY_MS
 *
 * @description
 * First reconnect delay, doubled on each further attempt.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
export const MERCURE_RECONNECT_BASE_DELAY_MS: number = 1_000;

/**
 * Constant MERCURE_RECONNECT_MAX_DELAY_MS
 *
 * @description
 * Ceiling for the reconnect delay.
 *
 * Attempts are never abandoned — a real-time channel that gives up is
 * indistinguishable from one that is broken — so the backoff caps instead of
 * counting out.
 *
 * @since 1.1.0
 *
 * @type {number}
 */
export const MERCURE_RECONNECT_MAX_DELAY_MS: number = 30_000;
