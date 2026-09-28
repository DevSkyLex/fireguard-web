import type { CalendarDisplayEvent } from '@shared/calendar/models/calendar-display-event.interface';

/**
 * Interface CalendarEventSpan
 * @interface CalendarEventSpan
 * @description A valid event range expressed in local calendar days before week clipping.
 * @since 1.0.0
 */
export interface CalendarEventSpan {
  /**
   * Property event
   * @readonly
   * @description The unchanged event supplied by the calendar owner.
   * @access public
   * @since 1.0.0
   * @type {CalendarDisplayEvent}
   */
  readonly event: CalendarDisplayEvent;

  /**
   * Property startDay
   * @readonly
   * @description The first included local calendar day.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly startDay: string;

  /**
   * Property endDay
   * @readonly
   * @description The last included local day, after timed midnight-end adjustment.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly endDay: string;
}
