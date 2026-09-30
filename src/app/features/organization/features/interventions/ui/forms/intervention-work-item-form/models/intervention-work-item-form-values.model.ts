import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkItemFormValues
 * @interface InterventionWorkItemFormValues
 *
 * @description
 * Prepared-scope task draft. Only the action is required; target, assignee and
 * estimate may remain unknown until field execution.
 *
 * @version 1.0.0
 */
export interface InterventionWorkItemFormValues {
  /**
   * Property estimatedMinutes
   * @readonly
   *
   * @description
   * Optional reference estimate in integral minutes; blank remains unknown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly estimatedMinutes: string;

  /**
   * Property workStartsOn
   * @readonly
   *
   * @description
   * Optional first organization-local work date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workStartsOn: string;

  /**
   * Property workEndsOn
   * @readonly
   *
   * @description
   * Optional last organization-local work date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workEndsOn: string;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Selects the action represented by this work-item form.
   *
   * @access public
   *
   * @type {InterventionWorkItemAction}
   */
  readonly action: InterventionWorkItemAction;

  /**
   * Property target
   * @readonly
   *
   * @description
   * Identifies the selected target for this work item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly target: string;

  /**
   * Property assignee
   * @readonly
   *
   * @description
   * Identifies the member assigned to the work item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly assignee: string;
}
