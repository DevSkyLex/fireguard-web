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
