import type { CallState } from '@core/request-state';

/**
 * Interface InterventionRecurrenceState
 * @interface InterventionRecurrenceState
 *
 * @description
 * Auxiliary state for {@link InterventionRecurrenceStore}. The recurrence
 * entities themselves are managed by `withEntities` — this interface covers
 * the per-action call states and the row-level write locks the recurrences
 * sheet needs.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionRecurrenceState {
  /** Organization owning the loaded rows and command state. */
  readonly organizationIri: string | null;
  /** Lifecycle of the list request (`load`). */
  readonly listCallState: CallState;

  /** Lifecycle of the create request (`create`). */
  readonly createCallState: CallState;

  /** Lifecycle of each recurrence's update, including its active toggle. */
  readonly updateCallStates: Readonly<Record<string, CallState>>;

  /** Lifecycle of each recurrence's deletion. */
  readonly removeCallStates: Readonly<Record<string, CallState>>;
}
