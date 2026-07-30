import type { CalendarEvent } from './calendar-event.interface';
import type { CalendarTimedEvent } from './calendar-timed-event.interface';

/**
 * Interface CalendarWeekDay
 *
 * @description
 * One day column of the week time-grid: its all-day events and its positioned
 * timed events.
 *
 * @since 1.0.0
 */
export interface CalendarWeekDay {
  /** Midnight (local) of the column's day. */
  readonly date: Date;

  /** Whether the day is the current local day. */
  readonly isToday: boolean;

  /** All-day events rendered in the column's header row. */
  readonly allDayEvents: readonly CalendarEvent[];

  /** Positioned timed events rendered in the column body. */
  readonly timedEvents: readonly CalendarTimedEvent[];
}
