import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionTransitionRequest
 * @interface InterventionTransitionRequest
 *
 * @description
 * A row menu asking for a status change. The table names the intervention and
 * the target; the page decides whether to confirm it and calls the store.
 *
 * @since 3.0.0
 */
export interface InterventionTransitionRequest {
  /** The intervention the menu was opened on. */
  readonly intervention: InterventionOutput;

  /** The status to move it to, taken from its own `allowedTransitions`. */
  readonly status: InterventionStatus;
}
