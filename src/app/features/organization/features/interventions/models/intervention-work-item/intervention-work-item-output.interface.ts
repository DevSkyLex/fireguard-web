import type { HydraItem } from '@core/api/models';
import type { InterventionWorkItemAction } from './intervention-work-item-action.type';
import type { InterventionWorkItemAssignee } from './intervention-work-item-assignee.interface';
import type { InterventionWorkItemSource } from './intervention-work-item-source.type';
import type { InterventionWorkItemStatus } from './intervention-work-item-status.type';
import type { InterventionWorkItemTarget } from './intervention-work-item-target.interface';

/**
 * Interface InterventionWorkItemOutput
 * @interface InterventionWorkItemOutput
 *
 * @description
 * Defines the intervention work item output contract.
 */
export interface InterventionWorkItemOutput extends HydraItem {
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
   * Property spentMinutes
   * @readonly
   *
   * @description
   * Total non-cancelled time recorded by all contributors.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly spentMinutes?: number;

  /**
   * Property allowedActions
   * @readonly
   *
   * @description
   * Caller-specific capabilities; missing cached capabilities do not imply permission.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {{ readonly canLogTime: boolean; readonly canManageTime: boolean; readonly canReestimate: boolean; readonly canReassign: boolean; readonly canEditPlanning: boolean }}
   */
  readonly allowedActions?: {
    readonly canExecute?: boolean;
    readonly canLogTime: boolean;
    readonly canManageTime: boolean;
    readonly canReestimate: boolean;
    readonly canReassign: boolean;
    readonly canEditPlanning: boolean;
  };
  /**
   * Property id
   * @readonly
   *
   * @description
   * Provides the id value.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Provides the intervention value.
   *
   * @type {string}
   */
  readonly intervention: string;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Provides the action value.
   *
   * @type {InterventionWorkItemAction}
   */
  readonly action: InterventionWorkItemAction;

  /**
   * Property target
   * @readonly
   *
   * @description
   * Provides the target value.
   *
   * @type {string | null}
   */
  readonly target: string | null;

  /**
   * Property targetSummary
   * @readonly
   *
   * @description
   * Resolved target summary (kind + label) embedded by the API. Absent on
   * optimistic work items, on free-text targets, and when unresolved.
   *
   * @type {InterventionWorkItemTarget | null | undefined}
   */
  readonly targetSummary?: InterventionWorkItemTarget | null;

  /**
   * Property resultResource
   * @readonly
   *
   * @description
   * Provides the result resource value.
   *
   * @type {string | null}
   */
  readonly resultResource: string | null;

  /**
   * Property assignee
   * @readonly
   *
   * @description
   * Provides the assignee value.
   *
   * @type {string | null}
   */
  readonly assignee: string | null;

  /**
   * Property assigneeProfile
   * @readonly
   *
   * @description
   * Resolved assignee identity (name + avatar) embedded by the API. Absent on
   * optimistic work items created offline before the server response.
   *
   * @type {InterventionWorkItemAssignee | null | undefined}
   */
  readonly assigneeProfile?: InterventionWorkItemAssignee | null;

  /**
   * Property source
   * @readonly
   *
   * @description
   * Provides the source value.
   *
   * @type {InterventionWorkItemSource}
   */
  readonly source: InterventionWorkItemSource;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Provides the status value.
   *
   * @type {InterventionWorkItemStatus}
   */
  readonly status: InterventionWorkItemStatus;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Provides the required value.
   *
   * @type {boolean}
   */
  readonly required: boolean;

  /**
   * Property skipReason
   * @readonly
   *
   * @description
   * Provides the skip reason value.
   *
   * @type {string | null}
   */
  readonly skipReason: string | null;

  /**
   * Property evidenceCount
   * @readonly
   *
   * @description
   * The number of attachments scoped to this work item, so a work item row
   * can show a photo-evidence badge without a separate per-item fetch.
   *
   * @type {number}
   */
  readonly evidenceCount: number;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Provides the revision value.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Provides the created at value.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Provides the updated at value.
   *
   * @type {string}
   */
  readonly updatedAt: string;
}
