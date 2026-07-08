/**
 * Interface InterventionCalendarWindow
 *
 * @description
 * Inclusive date window the calendar fetches interventions for. The page derives
 * it from the visible month (the focused month ± one month) so the calendar load
 * stays bounded and refetches only when the window changes.
 *
 * @since 1.1.0
 */
export interface InterventionCalendarWindow {
  /** Inclusive lower bound of the fetched window. */
  readonly after: Date;

  /** Inclusive upper bound of the fetched window. */
  readonly before: Date;
}
