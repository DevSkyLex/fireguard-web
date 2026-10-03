import { DateTime } from 'luxon';

/**
 * Function toApiDateTime
 *
 * @description
 * A `Date` as the RFC 3339 / ATOM string the calendar-event write endpoints
 * validate (`yyyy-MM-ddTHH:mm:ss+00:00`). `Date.prototype.toISOString()` is
 * NOT accepted there: its milliseconds (`.000Z`) fail the backend's strict
 * datetime constraint with a 422 — this helper renders the same UTC instant
 * without them.
 *
 * @since 1.0.0
 *
 * @param {Date | DateTime} value - The instant to serialize, with its zone already resolved.
 *
 * @returns {string} The ATOM-formatted UTC datetime.
 */
export function toApiDateTime(value: Date | DateTime): string {
  return (value instanceof Date ? value.toISOString() : (value.toUTC().toISO() ?? '')).replace(
    /\.\d{3}Z$/,
    '+00:00',
  );
}
