/**
 * Constant RELATIVE_TIME_UNITS
 *
 * @description
 * Units for `formatRelativeTime`, finest first. Each unit is used while its
 * rounded count stays below `max`; reaching it promotes the label to the next
 * unit, so 59 min 40 s reads "1 hour ago" rather than "60 minutes ago".
 *
 * @since 1.0.0
 */
const RELATIVE_TIME_UNITS: ReadonlyArray<{
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly seconds: number;
  readonly max: number;
}> = [
  { unit: 'minute', seconds: 60, max: 60 },
  { unit: 'hour', seconds: 3_600, max: 24 },
  { unit: 'day', seconds: 86_400, max: 7 },
  { unit: 'week', seconds: 604_800, max: 5 },
  { unit: 'month', seconds: 2_592_000, max: 12 },
  { unit: 'year', seconds: 31_536_000, max: Number.POSITIVE_INFINITY },
];

/**
 * Constant RELATIVE_TIME_FORMATS
 *
 * @description
 * One `Intl.RelativeTimeFormat` per locale, built on first use. The
 * constructor is among the most expensive objects the platform allocates,
 * and this function is called from per-row template bindings — a fresh
 * instance per call was a measurable change-detection cost.
 *
 * @since 1.0.0
 */
const RELATIVE_TIME_FORMATS = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Function relativeTimeFormatOf
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
function relativeTimeFormatOf(locale: string): Intl.RelativeTimeFormat {
  let format: Intl.RelativeTimeFormat | undefined = RELATIVE_TIME_FORMATS.get(locale);
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    RELATIVE_TIME_FORMATS.set(locale, format);
  }

  return format;
}

/**
 * Function formatRelativeTime
 *
 * @description
 * Turns an ISO-8601 timestamp into a localized relative label ("3 hours
 * ago", "in 3 days"), through `Intl.RelativeTimeFormat`. Anything under a
 * minute — past or future — reads "Just now" rather than a literal second
 * count, which no locale phrases naturally.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} iso - ISO-8601 timestamp to compare against `now`.
 * @param {string} locale - The application's active locale.
 * @param {Date} [now] - The instant to compare against. Defaults to the current time.
 *
 * @returns {string} A localized relative label, or the raw value if unparsable.
 */
export function formatRelativeTime(iso: string, locale: string, now: Date = new Date()): string {
  const parsed: number = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;

  const elapsed: number = (parsed - now.getTime()) / 1000;
  const format: Intl.RelativeTimeFormat = relativeTimeFormatOf(locale);

  if (Math.abs(elapsed) < 60) return $localize`:@@shared.relativeTime.justNow:Just now`;

  for (const { unit, seconds, max } of RELATIVE_TIME_UNITS) {
    const count: number = Math.round(Math.abs(elapsed) / seconds);
    if (count < max) return format.format(Math.sign(elapsed) * count, unit);
  }

  return iso;
}
