import type { HydraItem } from '@core/models/api';
import type { MissionChangeStatus } from './mission-change-status.type';

/**
 * Interface MissionChangeOutput
 * @interface MissionChangeOutput
 *
 * @description
 * Defines the mission change output contract.
 */
export interface MissionChangeOutput extends HydraItem {
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
   * Property workItem
   * @readonly
   *
   * @description
   * Provides the work item value.
   *
   * @type {string | null}
   */
  readonly workItem: string | null;

  /**
   * Property resource
   * @readonly
   *
   * @description
   * Provides the resource value.
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property patch
   * @readonly
   *
   * @description
   * Provides the patch value.
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  readonly patch: Readonly<Record<string, unknown>>;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Provides the status value.
   *
   * @type {MissionChangeStatus}
   */
  readonly status: MissionChangeStatus;

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
