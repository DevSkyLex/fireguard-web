import { formatDate } from '@angular/common';
import { Pipe, type PipeTransform } from '@angular/core';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '../../../constants/regional-format-defaults.constants';
import type { RegionalFormatSettings } from '../../../models/regional-format-settings.interface';

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
 * The `app` prefix on the pipe name disambiguates it from Angular's built-in
 * `date` pipe.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Pipe({ name: 'appOrgDate' })
export class OrgDatePipe implements PipeTransform {
  /**
   * Method transform
   * @method transform
   *
   * @description
   * Renders `value` as a date, or a date and time, per `settings`. Returns an
   * empty string for `null`, `undefined`, an empty string, or a value that
   * does not parse to a valid date — there is no sensible placeholder to
   * invent here, the call site decides what "no date" reads as.
   *
   * @param {Date | string | number | null | undefined} value - The date to render.
   * @param {'date' | 'datetime'} [mode] - Whether to include the time. Defaults to `'date'`.
   * @param {RegionalFormatSettings} [settings] - Formatting context. Defaults to {@link DEFAULT_REGIONAL_FORMAT_SETTINGS}.
   *
   * @returns {string} The formatted date, or `''` when `value` is absent or invalid.
   */
  public transform(
    value: Date | string | number | null | undefined,
    mode: 'date' | 'datetime' = 'date',
    settings: RegionalFormatSettings = DEFAULT_REGIONAL_FORMAT_SETTINGS,
  ): string {
    if (value === null || value === undefined || value === '') return '';

    const pattern: string =
      mode === 'datetime' ? `${settings.dateFormat} HH:mm` : settings.dateFormat;

    try {
      return formatDate(value, pattern, 'en-US', settings.timezone);
    } catch {
      return '';
    }
  }
}
