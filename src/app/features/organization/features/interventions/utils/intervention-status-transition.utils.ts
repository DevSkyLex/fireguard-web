import {
  INTERVENTION_BOARD_COLUMNS,
  INTERVENTION_STATUS_TRANSITIONS,
} from '@features/organization/features/interventions/constants';
import type {
  InterventionBoardColumnId,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Function canTransition
 *
 * @description
 * Whether moving an intervention from `from` to `to` is allowed by the workflow
 * policy. A no-op transition (`from === to`) is always allowed so same-lane
 * drops and reorders are accepted.
 *
 * @param {InterventionStatus} from - Current status.
 * @param {InterventionStatus} to - Candidate target status.
 *
 * @returns {boolean} True when the transition is permitted.
 *
 * @since 1.0.0
 */
export function canTransition(from: InterventionStatus, to: InterventionStatus): boolean {
  return from === to || INTERVENTION_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Function allowedTransitions
 *
 * @description
 * The statuses an intervention may move to from `from`, per the workflow policy.
 *
 * @param {InterventionStatus} from - Current status.
 *
 * @returns {readonly InterventionStatus[]} Allowed target statuses.
 *
 * @since 1.0.0
 */
export function allowedTransitions(from: InterventionStatus): readonly InterventionStatus[] {
  return INTERVENTION_STATUS_TRANSITIONS[from];
}

/**
 * Function columnIdForStatus
 *
 * @description
 * Resolves the board lane a status belongs to, or `null` when the status has no
 * lane (e.g. `abandoned`).
 *
 * @param {InterventionStatus} status - Status to resolve.
 *
 * @returns {InterventionBoardColumnId | null} Owning lane, or null.
 *
 * @since 1.0.0
 */
export function columnIdForStatus(status: InterventionStatus): InterventionBoardColumnId | null {
  return INTERVENTION_BOARD_COLUMNS.find((column) => column.statuses.includes(status))?.id ?? null;
}

/**
 * Function dropTargetForColumn
 *
 * @description
 * The status a card adopts when dropped into a lane, or `null` when the lane is
 * not a valid drop target.
 *
 * @param {InterventionBoardColumnId} columnId - Target lane.
 *
 * @returns {InterventionStatus | null} Status to adopt, or null.
 *
 * @since 1.0.0
 */
export function dropTargetForColumn(
  columnId: InterventionBoardColumnId,
): InterventionStatus | null {
  return INTERVENTION_BOARD_COLUMNS.find((column) => column.id === columnId)?.dropTarget ?? null;
}
