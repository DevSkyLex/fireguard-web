import type { InterventionStatus } from '../intervention/intervention-status.type';

/**
 * Interface InterventionTransitionRequest
 * @interface InterventionTransitionRequest
 *
 * @description
 * Intervention status transition requested by the workspace.
 *
 * @version 1.0.0
 */
export interface InterventionTransitionRequest {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Captured operational revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly revision?: number;

  /**
   * Property workloadConfirmationToken
   * @readonly
   *
   * @description
   * Agreement to the exact server workload evaluation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workloadConfirmationToken?: string;
  readonly interventionId: string;
  readonly status: InterventionStatus;
  readonly reviewNote?: string;
}
