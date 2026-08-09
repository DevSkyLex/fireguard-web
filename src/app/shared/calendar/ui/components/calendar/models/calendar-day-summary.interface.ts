import type { CalendarDisplayEvent } from '../../../../models/calendar-display-event.interface';

/**
 * Interface CalendarDaySummary
 * @interface CalendarDaySummary
 *
 * @description
 * Everything one day cell renders, resolved once per month instead of per
 * cell per change detection: the total the accessible name announces, the
 * chips that fit, the dots the phone layout shows instead, and the hidden
 * remainder.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarDaySummary {
  //#region Properties
  /** How many events the day carries in total. */
  readonly count: number;

  /** The events the cell renders as chips, capped. */
  readonly chips: readonly CalendarDisplayEvent[];

  /** One entry per density dot the compact layout renders, capped. */
  readonly dots: readonly number[];

  /** How many events the chips leave out, zero when everything fits. */
  readonly overflow: number;
  //#endregion
}
