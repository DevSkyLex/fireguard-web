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

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention transition request.
   *
   * @access public
   *
   * @type {InterventionStatus}
   */
  readonly status: InterventionStatus;

  /**
   * Property reviewNote
   * @readonly
   *
   * @description
   * Contains the reviewer note attached to this transition.
   *
   * @access public
   *
   * @type {string}
   */
  readonly reviewNote?: string;
}
