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

  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Identifies the client-created message used to correlate this send with its result.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientId?: string;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Contains the intervention currently loaded into the workspace.
   *
   * @access public
   *
   * @type {string}
   */
  readonly intervention: string;

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
   * @type {string | null}
   */
  readonly target?: string | null;

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
   * Property source
   * @readonly
   *
   * @description
   * Identifies the source that added this create intervention work item.
   *
   * @access public
   *
   * @type {InterventionWorkItemSource}
   */
  readonly source: InterventionWorkItemSource;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Indicates whether completing this checklist item is required.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly required: boolean;
}
