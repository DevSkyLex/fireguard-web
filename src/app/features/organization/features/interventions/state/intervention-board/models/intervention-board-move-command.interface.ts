import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardMoveCommand
 *
 * @description
 * Optimistic status-move request emitted when a card is dragged to another lane
 * or advanced through its action menu.
 *
 * @since 1.0.0
 */
export interface InterventionBoardMoveCommand {
  /** Intervention being moved, in its current (pre-move) shape. */
  readonly intervention: InterventionOutput;

  /** Target workflow status. */
  readonly toStatus: InterventionStatus;
}
