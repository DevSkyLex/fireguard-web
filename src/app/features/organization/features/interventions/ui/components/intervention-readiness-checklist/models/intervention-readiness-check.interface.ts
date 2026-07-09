/**
 * Interface InterventionReadinessCheck
 * @interface InterventionReadinessCheck
 *
 * @description
 * One readiness condition rendered in a workflow checklist: a human-readable
 * label and whether the condition is currently satisfied. Shared by the prepare
 * ("Ready to plan"), execute ("Ready to submit") and review ("Ready to publish")
 * phases so every phase surfaces its preconditions identically.
 */
export interface InterventionReadinessCheck {
  /** Human-readable condition label. */
  readonly label: string;
  /** Whether the condition is currently satisfied. */
  readonly done: boolean;
}
