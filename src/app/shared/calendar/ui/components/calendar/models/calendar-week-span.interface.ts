import type { CalendarWeekSegment } from './calendar-week-segment.interface';

/**
 * Interface CalendarWeekSpan
 * @interface CalendarWeekSpan
 * @description A clipped week range that has not yet been assigned a visible lane.
 * @since 1.0.0
 */
export interface CalendarWeekSpan extends Omit<CalendarWeekSegment, 'lane'> {
  /**
   * Property startColumn
   * @readonly
   * @description The first included column in its displayed week.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly startColumn: number;
}
