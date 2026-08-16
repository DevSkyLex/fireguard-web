import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface WorstFacility
 * @interface WorstFacility
 *
 * @description
 * One entry of the compliance layer's "worst sites" ranking: a located
 * facility paired with its known compliance rate. Only facilities with a
 * numeric rate are ever ranked — one with no compliance data yet cannot be
 * meaningfully ordered against the others.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface WorstFacility {
  /** The located facility. */
  readonly facility: FacilityOutput;

  /** Its known, whole-percentage compliance rate. */
  readonly complianceRate: number;
}
