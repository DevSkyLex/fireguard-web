import type { CalendarDaySummary } from './calendar-day-summary.interface';
import type { CalendarWeekSegment } from './calendar-week-segment.interface';

/**
 * Interface CalendarMonthLayout
 * @interface CalendarMonthLayout
 * @description Per-day counts and week-aligned bars for the visible month grid.
 * @version 1.0.0
 */
export interface CalendarMonthLayout {
  /** Total and hidden counts keyed by local ISO day. */
  readonly summaries: ReadonlyMap<string, CalendarDaySummary>;

  /** Rendered bars keyed by their first visible local ISO day. */
  readonly segmentsByStart: ReadonlyMap<string, readonly CalendarWeekSegment[]>;
}
