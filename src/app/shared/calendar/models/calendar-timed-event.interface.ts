import type { CalendarEvent } from './calendar-event.interface';

/**
 * Interface CalendarTimedEvent
 *
 * @description
 * A week-grid event positioned within its day column. Offsets are percentages
 * of the visible time window so the grid scales with the column height, and the
 * lane fields split the width between overlapping events.
 *
 * @since 1.0.0
 */
export interface CalendarTimedEvent {
  /** The underlying event. */
  readonly event: CalendarEvent;

  /** Top offset within the day column, as a percentage of the visible window. */
  readonly topPct: number;

  /** Height within the day column, as a percentage of the visible window. */
  readonly heightPct: number;

  /** Zero-based lane index among overlapping events in the same cluster. */
  readonly lane: number;

  /** Number of lanes in this event's overlap cluster. */
  readonly laneCount: number;
}
