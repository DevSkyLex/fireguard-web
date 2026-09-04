import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { capabilityForTransition } from '../intervention-status-transition/intervention-status-transition.utils';

/**
 * Function isInterventionBoardMoveAllowed
 *
 * @description
 * Applies the same transition and membership checks as the board's explanatory feedback.
 * Execute transitions require the responsible member or a participant; submit and withdraw use server capabilities.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput} intervention - The card's own intervention.
 * @param {InterventionStatus} target - The column being dropped onto.
 * @param {string | null} currentMemberIri - The active member's IRI, null until resolved.
 *
 * @returns {boolean} Whether the move is legal.
 */
export function isInterventionBoardMoveAllowed(
  intervention: InterventionOutput,
  target: InterventionStatus,
  currentMemberIri: string | null = null,
): boolean {
  return resolveInterventionBoardMoveReason(intervention, target, currentMemberIri) === null;
}

/**
 * Function resolveInterventionBoardMoveReason
 *
 * @description
 * Explains known transition and identity blockers before a drop or menu action.
 * Membership mirrors the API's execute guard because allowedTransitions describes workflow states, not caller access.
 *
 * @access public
 * @since 1.1.0
 *
 * @param {InterventionOutput} intervention - The current intervention and advertised capabilities.
 * @param {InterventionStatus} target - The requested destination.
 * @param {string | null} currentMemberIri - The active member's IRI, null until resolved.
 * @returns {string | null} A localized blocker, or null when the move is permitted.
 */
export function resolveInterventionBoardMoveReason(
  intervention: InterventionOutput,
  target: InterventionStatus,
  currentMemberIri: string | null,
): string | null {
  if (!intervention.allowedTransitions.includes(target)) {
    return $localize`:@@intervention.board.transitionUnavailable:This transition is not available from the current status.`;
  }

  if (intervention.status === 'submitted' && target === 'in_progress') {
    return intervention.allowedActions?.canWithdraw === true
      ? null
      : $localize`:@@intervention.board.withdrawOnly:Only the responsible can withdraw this submission.`;
  }

  if (target === 'submitted') {
    return intervention.allowedActions?.canSubmit === true
      ? null
      : $localize`:@@intervention.board.submitOnly:Only the responsible member can submit this intervention for review.`;
  }

  if (
    capabilityForTransition(intervention.status, target) === 'execute' &&
    (currentMemberIri === null ||
      (intervention.responsible !== currentMemberIri &&
        !intervention.participants.includes(currentMemberIri)))
  ) {
    return $localize`:@@intervention.board.executionMembersOnly:Only the responsible member or a participant can perform this transition.`;
  }

  return null;
}
