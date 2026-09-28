/**
 * Interface CalendarDaySummary
 * @interface CalendarDaySummary
 *
 * @description
 * Everything one day cell renders, resolved once per month instead of per
 * cell per change detection: the total the accessible name announces, the
 * dots the compact layout shows and the hidden
 * remainder.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarDaySummary {
  //#region Properties
  /** How many events the day carries in total. */
  readonly count: number;

  /** One entry per density dot the compact layout renders, capped. */
  readonly dots: readonly number[];

  /** How many events the visible bars leave out, zero when everything fits. */
  readonly overflow: number;

  /**
   * Distinct {@link CalendarDisplayEvent.sourceLabel} values carried by the
   * day, in first-occurrence order — the accessible route to which kinds of
   * event a day holds, since the chips themselves render `aria-hidden`.
   */
  readonly sourceLabels: readonly string[];
  //#endregion
}
