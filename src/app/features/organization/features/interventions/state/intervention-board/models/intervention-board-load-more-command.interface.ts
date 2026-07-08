import type { InterventionBoardColumnId } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardLoadMoreCommand
 *
 * @description
 * Request to reveal the next bounded page of cards for a single pipeline lane.
 * The store fetches the next page for every workflow status backing the lane
 * that still has un-loaded cards and appends them, de-duping by id.
 *
 * @since 1.0.0
 */
export interface InterventionBoardLoadMoreCommand {
  /** Active organization identifier, or null when none is selected. */
  readonly organizationId: string | null;

  /** Lane whose next page should be revealed. */
  readonly columnId: InterventionBoardColumnId;
}
