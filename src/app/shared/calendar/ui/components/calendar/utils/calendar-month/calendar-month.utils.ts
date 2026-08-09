/**
 * Interface CalendarMonthCell
 * @interface CalendarMonthCell
 *
 * @description
 * One cell of the month grid: the ISO day it stands for, whether it belongs
 * to the anchored month (leading/trailing days fill the weeks), and whether
 * it is today.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarMonthCell {
  //#region Properties
  /** The day as `yyyy-MM-dd`, in local time. */
  readonly iso: string;

  /** Day-of-month number, for the cell's visible label. */
  readonly day: number;

  /** Whether the day belongs to the anchored month. */
  readonly inMonth: boolean;

  /** Whether the day is `today`, per the instant passed in. */
  readonly isToday: boolean;
  //#endregion
}

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
 * Function buildCalendarMonth
 *
 * @description
 * The full weeks covering the anchor's month, Monday-first: 4 to 6 rows of 7
 * cells, the leading and trailing fillers marked `inMonth: false`. `now` is a
 * parameter rather than read here so the function stays pure and its spec
 * deterministic.
 *
 * @param {Date} anchor - Any date inside the month to build.
 * @param {Date} now - Instant "today" is resolved against.
 *
 * @returns {readonly (readonly CalendarMonthCell[])[]} The month's weeks.
 *
 * @since 1.0.0
 */
export function buildCalendarMonth(
  anchor: Date,
  now: Date,
): readonly (readonly CalendarMonthCell[])[] {
  const first: Date = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayOffset: number = (first.getDay() + 6) % 7;
  const start: Date = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  const today: string = toIsoDay(now);
  const month: number = anchor.getMonth();

  const weeks: CalendarMonthCell[][] = [];
  const cursor: Date = new Date(start);
  do {
    const week: CalendarMonthCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const iso: string = toIsoDay(cursor);
      week.push({
        iso,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
        isToday: iso === today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);

  return weeks;
}
