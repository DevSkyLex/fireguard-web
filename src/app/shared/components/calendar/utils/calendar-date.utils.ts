import { CALENDAR_WEEKDAY_SHORT } from './calendar.constants';

/**
 * Function startOfDay
 *
 * @description
 * Returns local midnight of the given date, dropping the time component.
 *
 * @param {Date} date - Date to normalize.
 * @returns {Date} Local midnight of `date`.
 *
 * @since 1.0.0
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Function startOfMonth
 *
 * @description
 * Returns the first day (local midnight) of the month containing `date`.
 *
 * @param {Date} date - Date within the target month.
 * @returns {Date} First day of the month.
 *
 * @since 1.0.0
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Function addDays
 *
 * @description
 * Returns `date` shifted by `days` (local midnight preserved across DST).
 *
 * @param {Date} date - Reference date.
 * @param {number} days - Number of days to add (may be negative).
 * @returns {Date} The shifted date at local midnight.
 *
 * @since 1.0.0
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Function addMonths
 *
 * @description
 * Returns the first day of the month `months` away from `date`. Anchoring on
 * day 1 avoids month-length overflow.
 *
 * @param {Date} date - Reference date.
 * @param {number} months - Number of months to add (may be negative).
 * @returns {Date} First day of the resulting month.
 *
 * @since 1.0.0
 */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/**
 * Function addWeeks
 *
 * @description
 * Returns `date` shifted by `weeks` whole weeks.
 *
 * @param {Date} date - Reference date.
 * @param {number} weeks - Number of weeks to add (may be negative).
 * @returns {Date} The shifted date at local midnight.
 *
 * @since 1.0.0
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Function startOfWeek
 *
 * @description
 * Returns the first day of the week containing `date` for the given week start.
 *
 * @param {Date} date - Date within the target week.
 * @param {0 | 1} weekStartsOn - 0 = Sunday, 1 = Monday.
 * @returns {Date} First day of the week at local midnight.
 *
 * @since 1.0.0
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const offset: number = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(startOfDay(date), -offset);
}

/**
 * Function isSameDay
 *
 * @description
 * Whether two dates fall on the same local calendar day.
 *
 * @param {Date} a - First date.
 * @param {Date} b - Second date.
 * @returns {boolean} True when both dates share the same local day.
 *
 * @since 1.0.0
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Function isSameMonth
 *
 * @description
 * Whether two dates fall in the same local month and year.
 *
 * @param {Date} a - First date.
 * @param {Date} b - Second date.
 * @returns {boolean} True when both dates share the same local month.
 *
 * @since 1.0.0
 */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Function dayKey
 *
 * @description
 * Stable `YYYY-MM-DD` key for a date in the local timezone, used to bucket
 * events by day without UTC-offset drift.
 *
 * @param {Date} date - Date to key.
 * @returns {string} Local `YYYY-MM-DD` key.
 *
 * @since 1.0.0
 */
export function dayKey(date: Date): string {
  const month: string = `${date.getMonth() + 1}`.padStart(2, '0');
  const day: string = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Function minutesSinceMidnight
 *
 * @description
 * Minutes elapsed since local midnight for the given date.
 *
 * @param {Date} date - Date to read the time from.
 * @returns {number} Minutes in the range 0–1439.
 *
 * @since 1.0.0
 */
export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Function weekdayLabels
 *
 * @description
 * Short weekday headers ordered for the given week start.
 *
 * @param {0 | 1} weekStartsOn - 0 = Sunday, 1 = Monday.
 * @returns {readonly string[]} Seven ordered labels.
 *
 * @since 1.0.0
 */
export function weekdayLabels(weekStartsOn: 0 | 1): readonly string[] {
  return [
    ...CALENDAR_WEEKDAY_SHORT.slice(weekStartsOn),
    ...CALENDAR_WEEKDAY_SHORT.slice(0, weekStartsOn),
  ];
}

/**
 * Function hoursRange
 *
 * @description
 * Inclusive list of hour marks from `startHour` to `endHour` used to label the
 * week time-grid.
 *
 * @param {number} startHour - First hour (0–23).
 * @param {number} endHour - Last hour (1–24).
 * @returns {readonly number[]} Ordered hour marks.
 *
 * @since 1.0.0
 */
export function hoursRange(startHour: number, endHour: number): readonly number[] {
  const hours: number[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    hours.push(hour);
  }
  return hours;
}
