import type { CalendarEvent } from './calendar-event.interface';

/**
 * Interface CalendarDay
 *
 * @description
 * One cell of the month grid: the day it represents, whether it belongs to the
 * displayed month (out-of-month cells are dimmed), whether it is today, and the
 * events anchored on that day.
 *
 * @since 1.0.0
 */
export interface CalendarDay {
  /** Midnight (local) of the day this cell represents. */
  readonly date: Date;

  /** Whether the day belongs to the currently displayed month. */
  readonly inMonth: boolean;

  /** Whether the day is the current local day. */
  readonly isToday: boolean;

  /** Events anchored on this day, in input order. */
  readonly events: readonly CalendarEvent[];
}

/**
 * Interface CalendarAgendaDay
 *
 * @description
 * One dated group of the agenda list: a day and the events anchored on it.
 *
 * @since 1.0.0
 */
export interface CalendarAgendaDay {
  /** Midnight (local) of the grouped day. */
  readonly date: Date;

  /** Events anchored on this day: all-day first, then ascending by start. */
  readonly events: readonly CalendarEvent[];
}
