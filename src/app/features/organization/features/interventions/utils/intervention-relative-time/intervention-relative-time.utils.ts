/**
 * Constant RELATIVE_UNITS
 *
 * @description
 * Thresholds for the relative timestamp, coarsest last. Each entry is the
 * number of seconds in one unit, so the first whose count reaches 1 wins.
 *
 * @since 1.0.0
 */
const RELATIVE_UNITS: ReadonlyArray<{
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly seconds: number;
}> = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

/**
 * Function formatInterventionRelativeTime
 *
 * @description
 * Turns an ISO-8601 timestamp into a localized relative label ("3 hours
 * ago"), for the detail page's meta line and its activity thread — the two
 * consumers that justify lifting this to the feature level rather than
 * duplicating it. Uses `Intl.RelativeTimeFormat` rather than a date library
 * (`ARCHITECTURE.md` §2.9).
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} iso - ISO-8601 timestamp from the API.
 * @param {string} locale - The application's active locale.
 *
 * @returns {string} A localized relative label, or the raw value if unparsable.
 */
export function formatInterventionRelativeTime(iso: string, locale: string): string {
  const parsed: number = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;

  const elapsed: number = (parsed - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= seconds) {
      return format.format(Math.round(elapsed / seconds), unit);
    }
  }

  return format.format(Math.round(elapsed), 'second');
}
