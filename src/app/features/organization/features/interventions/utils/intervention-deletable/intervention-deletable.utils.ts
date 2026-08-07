import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Constant DELETABLE_INTERVENTION_STATUSES
 * @const DELETABLE_INTERVENTION_STATUSES
 *
 * @description
 * Statuses from which `InterventionService.remove` is accepted by the API —
 * see `Intervention::assertDeletable` on the backend. Any other status is
 * refused with a 409 conflict.
 *
 * @since 4.1.0
 *
 * @type {ReadonlySet<InterventionStatus>}
 */
const DELETABLE_INTERVENTION_STATUSES: ReadonlySet<InterventionStatus> =
  new Set<InterventionStatus>(['draft', 'abandoned']);

/**
 * Function isInterventionDeletable
 * @function isInterventionDeletable
 *
 * @description
 * Whether the API would accept deleting an intervention in its current
 * status. Mirrors the backend's own guard so the list table and page never
 * offer a delete that would fail with a 409.
 *
 * @access public
 * @since 4.1.0
 *
 * @param {{ readonly status: InterventionStatus }} intervention - The intervention to check.
 *
 * @returns {boolean} True when its status allows deletion.
 */
export function isInterventionDeletable(intervention: {
  readonly status: InterventionStatus;
}): boolean {
  return DELETABLE_INTERVENTION_STATUSES.has(intervention.status);
}
