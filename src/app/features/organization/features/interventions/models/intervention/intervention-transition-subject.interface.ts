import type { InterventionStatus } from './intervention-status.type';

/**
 * Interface InterventionTransitionSubject
 * @interface InterventionTransitionSubject
 *
 * @description
 * Minimal shape the transition helpers need from an intervention: its current
 * status and, when present, the API-provided `allowedTransitions`. The field is
 * optional so a cached card persisted before the field existed still resolves
 * through the static fallback table.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionTransitionSubject {
  //#region Properties
  /** Current workflow status. */
  readonly status: InterventionStatus;

  /** The API's own legal next statuses, when the card carries them. */
  readonly allowedTransitions?: readonly InterventionStatus[];
  //#endregion
}
