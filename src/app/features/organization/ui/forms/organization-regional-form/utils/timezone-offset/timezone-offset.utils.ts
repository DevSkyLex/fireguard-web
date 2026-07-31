/**
 * Function getTimezoneOffsetLabel
 *
 * @description
 * Computes the current UTC offset for an IANA timezone and formats it as a
 * short, human-readable label such as `UTC+01:00`, `UTC-05:00`, or `UTC` for
 * zero-offset zones. The offset is resolved for the present instant, so it
 * already accounts for daylight saving time where applicable.
 *
 * @access public
 *
 * @param {string} timezone - IANA timezone identifier (e.g. `Europe/Paris`).
 * @returns {string} The formatted UTC offset label, or an empty string when the
 * timezone is unknown to the runtime.
 *
 * @since 1.0.0
 */
export function getTimezoneOffsetLabel(timezone: string): string {
  try {
    const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date());

    const raw: string = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';

    // `longOffset` yields values like `GMT+01:00`, `GMT-05:00`, or `GMT`.
    const normalized: string = raw.replace('GMT', 'UTC');

    return normalized === 'UTC' ? 'UTC' : normalized;
  } catch {
    return '';
  }
}
