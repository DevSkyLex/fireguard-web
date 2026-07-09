/**
 * Interface InterventionSubstep
 * @interface InterventionSubstep
 *
 * @description
 * One micro-step within a workflow phase, rendered as a segment of the sub-step
 * navigation. Sub-steps are free-navigable in-page views (the macro phase is the
 * gate), so a step carries only its stable key, its label and an optional
 * "complete" flag used to surface progress on the segment.
 */
export interface InterventionSubstep {
  /** Stable key identifying the step (matches the panel's `subStep` signal). */
  readonly key: string;
  /** Short segment label. */
  readonly label: string;
  /** Whether this step's work is done, surfaced as a check on the segment. */
  readonly complete?: boolean;
}
