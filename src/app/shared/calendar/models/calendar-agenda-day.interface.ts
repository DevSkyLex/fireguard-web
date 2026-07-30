import type { CalendarEvent } from './calendar-event.interface';

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
