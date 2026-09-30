import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';

/**
 * Interface InterventionWorkItemStatusChange
 * @interface InterventionWorkItemStatusChange
 *
 * @description
 * Captures a requested work-item status change and its accompanying reason.
 */
export interface InterventionWorkItemStatusChange {
  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Identifies the work item associated with this intervention work item status change.
   *
   * @access public
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention work item status change.
   *
   * @access public
   *
   * @type {InterventionWorkItemStatus}
   */
  readonly status: InterventionWorkItemStatus;

  /**
   * Property skipReason
   * @readonly
   *
   * @description
   * Explains why the work item was skipped.
   *
   * @access public
   *
   * @type {string}
   */
  readonly skipReason?: string;
}
