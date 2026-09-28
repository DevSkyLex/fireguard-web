import { formatDate } from '@angular/common';
import { Pipe, type PipeTransform } from '@angular/core';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '../../../constants/regional-format-defaults.constants';
import type { RegionalFormatSettings } from '../../../models/regional-format-settings.interface';
import type { OrgDateValue } from './models/org-date-value.type';

/**
 * Constant UTC_OR_OFFSET_PATTERN
 *
 * @description
 * Matches the two timezone forms Angular's `formatDate` understands natively
 * — `'UTC'` and a fixed `'+HHMM'` / `'-HHMM'` offset. Anything else is taken
 * to be an IANA zone name and resolved through {@link resolveUtcOffset}.
 *
 * @since 1.1.0
 */
const UTC_OR_OFFSET_PATTERN = /^(UTC|[+-]\d{4})$/;

/**
 * Function resolveUtcOffset
 *
 * @description
 * Computes the fixed UTC offset of `timeZone` at the instant `date`
 * represents, as `'+HHMM'` / `'-HHMM'` — DST-aware, since it reads the zone's
 * actual wall-clock time for that instant rather than a static table.
 *
 * @access private
 * @since 1.1.0
 *
 * @param {Date} date - The instant to resolve the offset for.
 * @param {string} timeZone - An IANA timezone name.
 *
 * @returns {string} The zone's offset at that instant, as `'+HHMM'` / `'-HHMM'`.
 *
 * @throws Propagates `Intl.DateTimeFormat`'s `RangeError` for an unknown zone.
 */
function resolveUtcOffset(date: Date, timeZone: string): string {
  const parts: ReadonlyArray<Intl.DateTimeFormatPart> = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const partValue = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asUtc: number = Date.UTC(
    partValue('year'),
    partValue('month') - 1,
    partValue('day'),
    partValue('hour') % 24,
    partValue('minute'),
    partValue('second'),
  );
  const diffMinutes: number = Math.round((asUtc - date.getTime()) / 60_000);
  const sign: string = diffMinutes >= 0 ? '+' : '-';
  const absMinutes: number = Math.abs(diffMinutes);

  return `${sign}${String(Math.trunc(absMinutes / 60)).padStart(2, '0')}${String(
    absMinutes % 60,
  ).padStart(2, '0')}`;
}

/**
 * Interface DateOnlyParts
 * @interface DateOnlyParts
 *
 * @description
 * The calendar-day components of a date-only value, read without any
 * timezone conversion.
 *
 * @since 1.1.0
 */
interface DateOnlyParts {
  //#region Properties
  /** @type {number} */
  readonly year: number;
  /** @type {number} */
  readonly month: number;
  /** @type {number} */
  readonly day: number;
  //#endregion
}

/**
 * Function resolveDateOnlyParts
 *
 * @description
 * Reads the calendar day out of a date-only value. A plain `'YYYY-MM-DD'`
 * string is parsed textually; anything else is read through its UTC getters,
 * so an ISO instant at UTC midnight yields the same day regardless of the
 * runtime's local timezone.
 *
 * @access private
 * @since 1.1.0
 *
 * @param {OrgDateValue} value - The date-only value to resolve.
 *
 * @returns {DateOnlyParts | null} The calendar day, or `null` when `value` does not parse.
 */
function resolveDateOnlyParts(value: OrgDateValue): DateOnlyParts | null {
  if (typeof value === 'string') {
    const plainDateMatch: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (plainDateMatch !== null) {
      return {
        year: Number(plainDateMatch[1]),
        month: Number(plainDateMatch[2]),
        day: Number(plainDateMatch[3]),
      };
    }
  }

  const parsed: Date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

/**
 * Pipe OrgDatePipe
 * @class OrgDatePipe
 *
 * @description
 * Formats a date using a {@link RegionalFormatSettings} context — the date
 * pattern and timezone an organization's regional preferences resolve to —
 * instead of Angular's fixed `date` pipe format tokens.
 *
 * Pure and dependency-free by design: it takes its formatting context as an
 * explicit third argument rather than injecting a port, so it stays testable
 * in isolation and never bypasses `OnPush` change detection. A call site
 * that needs the active organization's preferences reads them from a
 * `Signal<RegionalFormatSettings>` (published by the owning feature as a
 * port) and passes the current value as the argument — `{{ value | orgDate
 * : 'date' : regionalFormatting() }}`. Reading the signal inside the
 * template binding is what keeps the pipe reactive to a settings change: the
 * binding expression re-evaluates, the argument reference changes, and
 * Angular re-invokes this pure pipe. Omitting the third argument falls back
 * to {@link DEFAULT_REGIONAL_FORMAT_SETTINGS} (`dd/MM/yyyy`, UTC), so
 * `{{ value | orgDate }}` and `{{ value | orgDate : 'datetime' }}` both work
 * with no context wired at all.
 *
 * `settings.timezone` may be `'UTC'`, a fixed `'+HHMM'` offset, or an IANA
 * zone name (`'Europe/Paris'`) — Angular's `formatDate` only understands the
 * first two, so an IANA name is resolved to its actual, DST-aware offset at
 * the rendered instant before delegating. An unresolvable zone name falls
 * through unchanged, which `formatDate` then rejects the same way it always
 * has: caught below, rendered as `''`.
 *
 * `mode: 'dateOnly'` renders a calendar day with no timezone involved at
 * all: it accepts a plain `'YYYY-MM-DD'` string or an ISO instant at UTC
 * midnight, reads the day from it without conversion, and formats
 * `settings.dateFormat` against a local, timezone-less `Date` — so the day
 * never shifts regardless of where the code runs.
 *
 * The `app` prefix on the pipe name disambiguates it from Angular's built-in
 * `date` pipe.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Pipe({ name: 'appOrgDate' })
export class OrgDatePipe implements PipeTransform {
  /**
   * Method transform
   * @method transform
   *
   * @description
   * Renders `value` as a date, a date and time, or a bare calendar day, per
   * `settings`. Returns an empty string for `null`, `undefined`, an empty
   * string, or a value that does not parse to a valid date — there is no
   * sensible placeholder to invent here, the call site decides what "no
   * date" reads as.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {OrgDateValue | null | undefined} value - The date to render.
   * @param {'date' | 'datetime' | 'dateOnly'} [mode] - Rendering mode. Defaults to `'date'`.
   * @param {RegionalFormatSettings} [settings] - Formatting context. Defaults to {@link DEFAULT_REGIONAL_FORMAT_SETTINGS}.
   *
   * @returns {string} The formatted date, or `''` when `value` is absent or invalid.
   */
  public transform(
    value: OrgDateValue | null | undefined,
    mode: 'date' | 'datetime' | 'dateOnly' = 'date',
    settings: RegionalFormatSettings = DEFAULT_REGIONAL_FORMAT_SETTINGS,
  ): string {
    if (value === null || value === undefined || value === '') return '';

    if (mode === 'dateOnly') return this.transformDateOnly(value, settings);

    const pattern: string =
      mode === 'datetime' ? `${settings.dateFormat} HH:mm` : settings.dateFormat;
    const timezone: string = this.resolveEffectiveTimezone(value, settings.timezone);

    try {
      return formatDate(value, pattern, 'en-US', timezone);
    } catch {
      return '';
    }
  }

  /**
   * Method resolveEffectiveTimezone
   * @method resolveEffectiveTimezone
   *
   * @description
   * Passes `'UTC'` and a fixed offset through unchanged; resolves anything
   * else as an IANA zone name to its DST-aware offset at `value`'s instant.
   * Falls back to `timezone` unchanged when it does not parse or the zone is
   * unknown, leaving `formatDate` to reject it exactly as before.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {OrgDateValue} value - The instant being rendered.
   * @param {string} timezone - The configured timezone.
   *
   * @returns {string} The timezone argument to hand to `formatDate`.
   */
  private resolveEffectiveTimezone(value: OrgDateValue, timezone: string): string {
    if (UTC_OR_OFFSET_PATTERN.test(timezone)) return timezone;

    const instant: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(instant.getTime())) return timezone;

    try {
      return resolveUtcOffset(instant, timezone);
    } catch {
      return timezone;
    }
  }

  /**
   * Method transformDateOnly
   * @method transformDateOnly
   *
   * @description
   * Renders a calendar day with no timezone conversion, per `mode: 'dateOnly'`.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {OrgDateValue} value - A `'YYYY-MM-DD'` string or a UTC-midnight instant.
   * @param {RegionalFormatSettings} settings - Formatting context.
   *
   * @returns {string} The formatted day, or `''` when `value` does not parse.
   */
  private transformDateOnly(value: OrgDateValue, settings: RegionalFormatSettings): string {
    const parts: DateOnlyParts | null = resolveDateOnlyParts(value);
    if (parts === null) return '';

    const localDay: Date = new Date(parts.year, parts.month - 1, parts.day);

    try {
      return formatDate(localDay, settings.dateFormat, 'en-US');
    } catch {
      return '';
    }
  }
}
