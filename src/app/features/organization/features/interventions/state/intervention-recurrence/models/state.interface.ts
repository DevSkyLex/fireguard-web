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
  /** Lifecycle of the list request (`load`). */
  readonly listCallState: CallState;

  /** Lifecycle of the create request (`create`). */
  readonly createCallState: CallState;

  /**
   * Lifecycle of the **last** update request (`update`), which also covers
   * the active-toggle's own write; per-row attribution lives in
   * {@link savingId}.
   */
  readonly updateCallState: CallState;

  /**
   * Lifecycle of the **last** delete request (`remove`); per-row attribution
   * lives in {@link removingId}.
   */
  readonly removeCallState: CallState;

  /** Id of the recurrence whose update write is in flight, so only that row locks. */
  readonly savingId: string | null;

  /** Id of the recurrence whose delete write is in flight, so only that row locks. */
  readonly removingId: string | null;
}
