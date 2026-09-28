/**
 * Constant RELATIVE_DAYS_FORMATS
 *
 * @description
 * One `Intl.RelativeTimeFormat` per locale, built on first use — the
 * constructor is among the most expensive objects the platform allocates.
 *
 * @since 1.0.0
 */
const RELATIVE_DAYS_FORMATS = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Function relativeDaysFormatOf
 *
 * @description
 * The memoized formatter for a locale.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} locale - The application's active locale.
 *
 * @returns {Intl.RelativeTimeFormat} The cached formatter.
 */
function relativeDaysFormatOf(locale: string): Intl.RelativeTimeFormat {
  let format: Intl.RelativeTimeFormat | undefined = RELATIVE_DAYS_FORMATS.get(locale);
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    RELATIVE_DAYS_FORMATS.set(locale, format);
  }

  return format;
}

/**
 * Function calendarDayCountOf
 *
 * @description
 * The day count of an ISO date-only string (`'YYYY-MM-DD'`) or an ISO
 * instant, counted from the UTC epoch and read from the value's own written
 * `YYYY-MM-DD` characters — never through a timezone conversion. That keeps
 * the day fixed across DST and on runtimes behind UTC; an instant must
 * therefore be written at UTC midnight for its date part to be the intended day.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} isoDate - A `'YYYY-MM-DD'` string or an ISO instant at UTC midnight.
 *
 * @returns {number} The number of whole days since the UTC epoch, or `NaN` when unparsable.
 */
function calendarDayCountOf(isoDate: string): number {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return Number.NaN;

  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/**
 * Function formatRelativeDays
 *
 * @description
 * Turns the whole calendar-day gap between `isoDate` and `todayIso` into a
 * localized relative label ("today", "tomorrow", "in 3 days", "2 days ago"),
 * through `Intl.RelativeTimeFormat`. Both arguments accept a plain
 * `'YYYY-MM-DD'` string or an ISO instant at UTC midnight; neither is ever
 * read through the runtime's local timezone, so the result stays a whole
 * calendar day regardless of DST or where the code runs.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} isoDate - The date to compare, as `'YYYY-MM-DD'` or a UTC-midnight instant.
 * @param {string} todayIso - The reference date, in the same form.
 * @param {string} locale - The application's active locale.
 *
 * @returns {string} A localized relative day label, or `isoDate` itself when either value is unparsable.
 */
export function formatRelativeDays(isoDate: string, todayIso: string, locale: string): string {
  const dayDiff: number = calendarDayCountOf(isoDate) - calendarDayCountOf(todayIso);
  if (!Number.isFinite(dayDiff)) return isoDate;

  return relativeDaysFormatOf(locale).format(dayDiff, 'day');
}
