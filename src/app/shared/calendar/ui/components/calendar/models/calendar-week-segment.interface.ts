import type { CalendarDisplayEvent } from '../../../../models/calendar-display-event.interface';

/**
 * Interface CalendarWeekSegment
 * @interface CalendarWeekSegment
 * @description One visible, uninterrupted part of an event inside a calendar week.
 * @version 1.0.0
 */
export interface CalendarWeekSegment {
  /** The source event whose tone and label the bar renders. */
  readonly event: CalendarDisplayEvent;

  /** First visible local day of this segment. */
  readonly startDay: string;

  /** Number of consecutive day columns covered in this week. */
  readonly days: number;

  /** Zero-based vertical lane shared by all covered cells. */
  readonly lane: number;

  /** The event began before this segment. */
  readonly continuesBefore: boolean;

  /** The event continues beyond this segment. */
  readonly continuesAfter: boolean;
}
