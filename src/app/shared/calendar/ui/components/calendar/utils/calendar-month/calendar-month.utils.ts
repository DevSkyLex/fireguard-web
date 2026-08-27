import type { CalendarFirstDayOfWeek } from '../../../../../models/calendar-first-day-of-week.type';

/**
 * Function toIsoDay
 *
 * @description
 * A date's local calendar day as `yyyy-MM-dd` — local, not UTC: the grid is
 * a wall-calendar, and `toISOString` would shift a late-evening date to the
 * next UTC day.
 *
 * @param {Date} date - The date to collapse to its local day.
 *
 * @returns {string} The `yyyy-MM-dd` day.
 *
 * @since 1.0.0
 */
export function toIsoDay(date: Date): string {
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Function startOfMonth
 *
 * @description
 * Local midnight on the first of the given date's month — the canonical anchor
 * the grid and its focus tracking compare against.
 *
 * @param {Date} date - Any date inside the month.
 *
 * @returns {Date} The month's first day at local midnight.
 *
 * @since 1.0.0
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Function buildCalendarMonthDays
 *
 * @description
 * The full weeks covering the anchor's month, as a flat run of local
 * midnights whose length is always a multiple of seven — the shape
 * `brnCalendarWeek` chunks into rows. The week starts on the given day
 * (Monday by default, per the organization's regional preference). Pure:
 * "today" is not resolved here, so the same inputs always yield the same
 * grid.
 *
 * @param {Date} anchor - Any date inside the month to build.
 * @param {CalendarFirstDayOfWeek} firstDayOfWeek - The day the rendered week starts on.
 *
 * @returns {Date[]} The month's days plus the leading and trailing fillers.
 *
 * @since 1.0.0
 */
export function buildCalendarMonthDays(
  anchor: Date,
  firstDayOfWeek: CalendarFirstDayOfWeek = 'monday',
): Date[] {
  const first: Date = startOfMonth(anchor);
  const startOffset: number =
    firstDayOfWeek === 'monday' ? (first.getDay() + 6) % 7 : first.getDay();
  const month: number = first.getMonth();

  const days: Date[] = [];
  const cursor: Date = new Date(first.getFullYear(), month, 1 - startOffset);
  do {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } while (cursor.getMonth() === month);

  return days;
}
