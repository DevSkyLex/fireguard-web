/**
 * Interface InterventionCalendarLoadRequest
 *
 * @description
 * Input used to load the organization intervention calendar.
 *
 * @since 1.0.0
 */
export interface InterventionCalendarLoadRequest {
  /** Active organization identifier, or null when none is selected. */
  readonly organizationId: string | null;
}
