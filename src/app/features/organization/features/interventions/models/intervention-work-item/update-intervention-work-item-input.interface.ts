import type { InterventionWorkItemStatus } from './intervention-work-item-status.type';

/**
 * Interface UpdateInterventionWorkItemInput
 * @interface UpdateInterventionWorkItemInput
 *
 * @description
 * Input used to update an intervention work item.
 *
 * @version 1.0.0
 */
export interface UpdateInterventionWorkItemInput {
  /**
   * Property estimatedMinutes
   * @readonly
   *
   * @description
   * Reference estimate; null means not estimated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly estimatedMinutes?: number | null;

  /**
   * Property workStartsOn
   * @readonly
   *
   * @description
   * Optional organization-local work period start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly workStartsOn?: string | null;

  /**
   * Property workEndsOn
   * @readonly
   *
   * @description
   * Optional organization-local work period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly workEndsOn?: string | null;

  /**
   * Property remainingMinutes
   * @readonly
   *
   * @description
   * Explicit remaining effort, independent of time recorded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly remainingMinutes?: number | null;

  /**
   * Property workloadConfirmationToken
   * @readonly
   *
   * @description
   * Explicit approval of the displayed overload assessment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workloadConfirmationToken?: string;

  /**
   * Property resultResource
   * @readonly
   *
   * @description
   * Identifies the resource produced or updated by this work item, when one exists.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly resultResource?: string | null;

  /**
   * Property assignee
   * @readonly
   *
   * @description
   * Identifies the member assigned to the work item.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly assignee?: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this update intervention work item.
   *
   * @access public
   *
   * @type {InterventionWorkItemStatus}
   */
  readonly status?: InterventionWorkItemStatus;

  /**
   * Property skipReason
   * @readonly
   *
   * @description
   * Explains why the work item was skipped.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly skipReason?: string | null;
}
