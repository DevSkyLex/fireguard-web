import type { InterventionWorkItemAction } from './intervention-work-item-action.type';
import type { InterventionWorkItemSource } from './intervention-work-item-source.type';

/**
 * Interface CreateInterventionWorkItemInput
 * @interface CreateInterventionWorkItemInput
 *
 * @description
 * Input used to create an intervention work item.
 *
 * @version 1.0.0
 */
export interface CreateInterventionWorkItemInput {
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
  readonly clientId?: string;
  readonly intervention: string;
  readonly action: InterventionWorkItemAction;
  readonly target?: string | null;
  readonly resultResource?: string | null;
  readonly assignee?: string | null;
  readonly source: InterventionWorkItemSource;
  readonly required: boolean;
}
