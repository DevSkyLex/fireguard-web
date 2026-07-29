import { INTERVENTION_STATUS_TRANSITIONS } from '@features/organization/features/interventions/constants';
import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Type InterventionTransitionCapability
 * @type InterventionTransitionCapability
 *
 * @description
 * The RBAC capability a workflow transition requires, mirroring the backend
 * `MutateInterventionWorkflowHandler::permission()` mapping. Consumers resolve
 * it to the matching `INTERVENTIONS_{PLAN,EXECUTE,REVIEW}` permission so the UI
 * only offers moves the server would authorize.
 *
 * @since 1.0.0
 */
export type InterventionTransitionCapability = 'plan' | 'execute' | 'review';

/**
 * Type InterventionTransitionSubject
 * @type InterventionTransitionSubject
 *
 * @description
 * Minimal shape the transition helpers need from an intervention: its current
 * status and, when present, the API-provided `allowedTransitions`. The field is
 * optional so a cached card persisted before the field existed still resolves
 * through the static fallback table.
 *
 * @since 1.0.0
 */
export interface InterventionTransitionSubject {
  readonly status: InterventionStatus;
  readonly allowedTransitions?: readonly InterventionStatus[];
}

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
 * Function canTransitionIntervention
 *
 * @description
 * Whether an intervention may move to `to`, driven by its per-card
 * {@link resolveAllowedTransitions} set. A no-op transition (`status === to`) is
 * always allowed so same-lane drops and reorders are accepted.
 *
 * @param {InterventionTransitionSubject} intervention - Intervention to evaluate.
 * @param {InterventionStatus} to - Candidate target status.
 *
 * @returns {boolean} True when the transition is workflow-legal.
 *
 * @since 1.0.0
 */
export function canTransitionIntervention(
  intervention: InterventionTransitionSubject,
  to: InterventionStatus,
): boolean {
  return intervention.status === to || resolveAllowedTransitions(intervention).includes(to);
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
