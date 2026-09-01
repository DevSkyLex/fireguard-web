/**
 * Function toUtcMidnight
 * @function toUtcMidnight
 *
 * @description
 * Re-anchors a date-only picker value to midnight UTC of the same calendar
 * day. A date picker builds its `Date` at *local* midnight, so serializing it
 * (`toISOString`) shifts the instant by the user's UTC offset — a planned
 * window picked as "2 Sep" in Paris was stored as `2026-09-01T22:00:00Z` and
 * every UTC-rendered surface then displayed the previous day. Anchoring the
 * instant at UTC midnight makes the stored day independent of the picker's
 * timezone.
 *
 * @since 7.2.0
 *
 * @param {Date} date - A local-midnight date-only value from a date picker.
 *
 * @return {Date} The same calendar day at `00:00:00.000Z`.
 */
export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
