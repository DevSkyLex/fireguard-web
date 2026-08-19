import type { CallState } from '@core/request-state';

/**
 * Interface InterventionLabelState
 * @interface InterventionLabelState
 *
 * @description
 * Auxiliary state for {@link InterventionLabelStore}. The label entities
 * themselves are managed by `withEntities` — this interface only covers the
 * per-action call states and the row-level write locks the manage dialog
 * needs.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionLabelState {
  /** Lifecycle of the label list request (`load`). */
  readonly listCallState: CallState;

  /** Lifecycle of the create request (`create`). */
  readonly createCallState: CallState;

  /**
   * Lifecycle of the **last** rename/recolor request (`update`); per-row
   * attribution lives in {@link savingId}.
   */
  readonly updateCallState: CallState;

  /**
   * Lifecycle of the **last** delete request (`remove`); per-row attribution
   * lives in {@link removingId}.
   */
  readonly removeCallState: CallState;

  /** Id of the label whose rename/recolor write is in flight, so only that row locks. */
  readonly savingId: string | null;

  /** Id of the label whose delete write is in flight, so only that row locks. */
  readonly removingId: string | null;
}
