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
  readonly action: InterventionWorkItemAction;
  readonly target: string;
  readonly assignee: string;
}
