import type { HydraItem } from '@core/models/api';
import type { InterventionChangeStatus } from './intervention-change-status.type';

/**
 * Interface InterventionChangeOutput
 * @interface InterventionChangeOutput
 *
 * @description
 * Defines the intervention change output contract.
 */
export interface InterventionChangeOutput extends HydraItem {
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
   * @type {InterventionChangeStatus}
   */
  readonly status: InterventionChangeStatus;

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
