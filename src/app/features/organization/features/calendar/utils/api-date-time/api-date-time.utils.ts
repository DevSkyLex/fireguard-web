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
 * @param {Date} value - The instant to serialize.
 *
 * @returns {string} The ATOM-formatted UTC datetime.
 *
 * @since 1.0.0
 */
export function toApiDateTime(value: Date): string {
  return value.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}
