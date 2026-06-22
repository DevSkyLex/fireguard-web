import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionCalendarState
 *
 * @description
 * State of the organization intervention calendar: every intervention for the
 * active organization (the All/Mine scope is filtered in the page from
 * {@link InterventionCalendarState.currentMemberIri}), the current member IRI
 * used by the "Mine" filter, and the in-flight loading flag.
 *
 * @since 1.0.0
 */
export interface InterventionCalendarState {
  /** All interventions for the active organization. */
  readonly interventions: readonly InterventionOutput[];

  /** IRI of the current member, used to filter the calendar to "Mine". */
  readonly currentMemberIri: string | null;

  /** Whether the calendar data is currently loading. */
  readonly loading: boolean;
}
