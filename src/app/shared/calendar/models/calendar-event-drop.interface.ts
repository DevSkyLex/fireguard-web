/**
 * Interface CalendarEventDrop
 * @interface CalendarEventDrop
 *
 * @description
 * A completed chip drag: which event (`CalendarDisplayEvent.id`) was dropped
 * onto which day (`yyyy-MM-dd`). Deliberately domain-free — the calendar
 * reports the gesture, the hosting feature decides what rescheduling means
 * (ARCHITECTURE.md §2.7: the calendar is a shared concept precisely because
 * its outputs stay generic).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarEventDrop {
  //#region Properties
  /** The dropped chip's `CalendarDisplayEvent.id`. */
  readonly id: string;

  /** The target day, as `yyyy-MM-dd`. */
  readonly day: string;
  //#endregion
}
