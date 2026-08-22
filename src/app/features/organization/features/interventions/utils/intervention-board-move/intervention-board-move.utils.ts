import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Function isInterventionBoardMoveAllowed
 *
 * @description
 * Whether the Board (`ui/components/intervention-board/`) may drop a card
 * onto a given status column: the target must be one of the card's own
 * server-advertised `allowedTransitions` (`published` never appears there —
 * it is reached only through the publication flow, so its column is a
 * legal-looking lane that never accepts a drop) and, for the one
 * identity-restricted move the board offers a lane for — withdrawing a
 * submission (`submitted` → `in_progress`) — the card's own
 * `allowedActions.canWithdraw` must also be `true`, mirroring
 * `InterventionDetailPage`'s `transitionTargets()` gate
 * (`utils/intervention-capabilities/`). Used by both the drag-drop
 * `cdkDropListEnterPredicate` and the card's keyboard "Move to…" menu, so the
 * two paths can never disagree about what is offered.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput} intervention - The card's own intervention.
 * @param {InterventionStatus} target - The column being dropped onto.
 *
 * @returns {boolean} Whether the move is legal.
 */
export function isInterventionBoardMoveAllowed(
  intervention: InterventionOutput,
  target: InterventionStatus,
): boolean {
  if (!intervention.allowedTransitions.includes(target)) return false;

  if (intervention.status === 'submitted' && target === 'in_progress') {
    return intervention.allowedActions?.canWithdraw === true;
  }

  return true;
}
