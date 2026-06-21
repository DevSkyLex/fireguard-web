/**
 * Type QuotaStatus
 * @type QuotaStatus
 *
 * @description
 * Severity of a capped resource's consumption against its plan limit:
 * - `ok`   — comfortably below the limit,
 * - `near` — approaching the limit (at or above the near-limit ratio),
 * - `full` — the limit has been reached.
 *
 * An unlimited resource (no plan cap) is always `ok`.
 *
 * @since 1.0.0
 */
export type QuotaStatus = 'ok' | 'near' | 'full';
