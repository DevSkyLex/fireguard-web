import { INTERVENTION_STATUS_TRANSITIONS } from '@features/organization/features/interventions/constants';
import type {
  InterventionStatus,
  InterventionTransitionCapability,
  InterventionTransitionSubject,
} from '@features/organization/features/interventions/models';

/**
 * Function allowedTransitions
 *
 * @description
 * The statuses an intervention may move to from `from`, per the static workflow
 * policy. Kept as the fallback source for {@link resolveAllowedTransitions}.
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
 * Function resolveAllowedTransitions
 *
 * @description
 * The workflow-legal next statuses for an intervention. Prefers the per-card
 * `allowedTransitions` returned by the API (the single source of truth, straight
 * from the domain policy); falls back to the static {@link allowedTransitions}
 * table only when the field is absent — e.g. a card cached offline before the
 * field shipped. An explicit empty array (a legitimately terminal status) is
 * honoured, not treated as missing.
 *
 * @param {InterventionTransitionSubject} intervention - Intervention to resolve.
 *
 * @returns {readonly InterventionStatus[]} Legal target statuses.
 *
 * @since 1.0.0
 */
export function resolveAllowedTransitions(
  intervention: InterventionTransitionSubject,
): readonly InterventionStatus[] {
  return intervention.allowedTransitions ?? allowedTransitions(intervention.status);
}

/**
 * Function capabilityForTransition
 *
 * @description
 * The RBAC capability required to move an intervention from `from` to `to`,
 * mirroring the backend `MutateInterventionWorkflowHandler::permission()`:
 * `planned`→plan; `in_progress`/`submitted`→execute; `changes_requested`→review;
 * `abandoned`→ depends on the source status (draft→plan, changes_requested→
 * review, otherwise execute).
 *
 * @param {InterventionStatus} from - Source status.
 * @param {InterventionStatus} to - Target status.
 *
 * @returns {InterventionTransitionCapability} Capability the move requires.
 *
 * @since 1.0.0
 */
export function capabilityForTransition(
  from: InterventionStatus,
  to: InterventionStatus,
): InterventionTransitionCapability {
  switch (to) {
    case 'planned':
      return 'plan';
    case 'changes_requested':
      return 'review';
    case 'abandoned':
      if (from === 'draft') return 'plan';
      if (from === 'changes_requested') return 'review';
      return 'execute';
    default:
      return 'execute';
  }
}
