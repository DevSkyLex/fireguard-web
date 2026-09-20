import { DateTime } from 'luxon';

/**
 * Function workloadWeekStart
 * @function workloadWeekStart
 *
 * @description
 * Resolves a calendar week in the organization's zone, never in the browser's zone.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} today - Organization-local date.
 * @param {'monday' | 'sunday'} firstDay - Organization week boundary.
 * @param {number} offset - Signed week offset.
 * @returns {string} ISO local date of the first day.
 */
export function workloadWeekStart(
  today: string,
  firstDay: 'monday' | 'sunday',
  offset: number,
): string {
  const date = DateTime.fromISO(today, { zone: 'UTC' });
  if (!date.isValid || !Number.isInteger(offset)) throw new RangeError('Invalid workload week');
  const previousDays = firstDay === 'sunday' ? date.weekday % 7 : date.weekday - 1;
  const start = date.minus({ days: previousDays }).plus({ weeks: offset }).toISODate();
  if (!start) throw new RangeError('Invalid workload week');
  return start;
}
