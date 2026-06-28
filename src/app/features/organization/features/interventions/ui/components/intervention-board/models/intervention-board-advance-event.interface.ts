import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardAdvanceEvent
 *
 * @description
 * Emitted by the board when a card should advance to another workflow status,
 * either by drag-and-drop between lanes or through the card action menu. The
 * parent page maps it onto the board store's optimistic move.
 *
 * @since 1.0.0
 */
export interface InterventionBoardAdvanceEvent {
  /** Intervention to advance, in its current (pre-move) shape. */
  readonly intervention: InterventionOutput;

  /** Target workflow status. */
  readonly toStatus: InterventionStatus;
}
