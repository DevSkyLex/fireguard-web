/**
 * Constant PERMANENT_FAILURE_STATUSES
 * @const PERMANENT_FAILURE_STATUSES
 *
 * @description
 * HTTP statuses treated as permanent replay failures: the offending
 * operation is dropped from the outbox instead of being retried.
 *
 * @since 1.0.0
 *
 * @type {ReadonlySet<number>}
 */
export const PERMANENT_FAILURE_STATUSES: ReadonlySet<number> = new Set([400, 403, 409, 422]);
