import type { HydraItem } from '@core/api/models';
import type { WorkloadAssessment } from './workload-assessment.interface';

/**
 * Interface WorkloadAssessmentOutput
 * @interface WorkloadAssessmentOutput
 *
 * @description
 * Assessment response without a planning mutation.
 *
 * @since 1.0.0
 */
export interface WorkloadAssessmentOutput extends HydraItem {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property assessment
   * @readonly
   *
   * @description
   * Proposed daily impact.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WorkloadAssessment}
   */
  readonly assessment: WorkloadAssessment;
}
