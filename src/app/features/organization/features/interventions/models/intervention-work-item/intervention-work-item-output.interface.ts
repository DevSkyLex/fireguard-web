import type { HydraItem } from '@core/models/api';
import type { MissionWorkItemAction } from './mission-work-item-action.type';
import type { MissionWorkItemSource } from './mission-work-item-source.type';
import type { MissionWorkItemStatus } from './mission-work-item-status.type';

/**
 * Interface MissionWorkItemOutput
 * @interface MissionWorkItemOutput
 *
 * @description
 * Defines the mission work item output contract.
 */
export interface MissionWorkItemOutput extends HydraItem {
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
   * Property mission
   * @readonly
   *
   * @description
   * Provides the mission value.
   *
   * @type {string}
   */
  readonly mission: string;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Provides the action value.
   *
   * @type {MissionWorkItemAction}
   */
  readonly action: MissionWorkItemAction;

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
   * Property source
   * @readonly
   *
   * @description
   * Provides the source value.
   *
   * @type {MissionWorkItemSource}
   */
  readonly source: MissionWorkItemSource;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Provides the status value.
   *
   * @type {MissionWorkItemStatus}
   */
  readonly status: MissionWorkItemStatus;

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
