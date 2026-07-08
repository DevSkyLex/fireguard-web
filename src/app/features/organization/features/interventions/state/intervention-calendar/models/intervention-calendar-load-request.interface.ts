import type { InterventionCalendarWindow } from './intervention-calendar-window.interface';

/**
 * Interface InterventionCalendarLoadRequest
 *
 * @description
 * Input used to load the organization intervention calendar for a bounded date
 * window (the visible month ± one month), keeping the load bounded instead of
 * fetching the whole organization history.
 *
 * @since 1.1.0
 */
export interface InterventionCalendarLoadRequest {
  /** Active organization identifier, or null when none is selected. */
  readonly organizationId: string | null;

  /** Inclusive date window to fetch interventions for. */
  readonly window: InterventionCalendarWindow;
}
