import type { MaintenanceCostAllocation } from './maintenance-cost-allocation.interface';

/**
 * Interface MaintenanceCostItem
 * @interface MaintenanceCostItem
 *
 * @description
 * A private immutable contribution or compensating adjustment.
 */
export interface MaintenanceCostItem {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional directly assigned equipment identifier, retained even without an operational task.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly equipmentId?: string | null;

  /**
   * Property allocation
   * @readonly
   *
   * @description
   * Optional private source identity; older immutable snapshots can omit this additive contract.
   *
   * @access public
   *
   * @type {MaintenanceCostAllocation | null | undefined}
   */
  readonly allocation?: MaintenanceCostAllocation | null;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable contribution identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Source category.
   *
   * @access public
   *
   * @type {'time' | 'material' | 'expense'}
   */
  readonly kind: 'time' | 'material' | 'expense';

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Associated work item when available.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly workItemId?: string | null;

  /**
   * Property sourceId
   * @readonly
   *
   * @description
   * Original time, stock or expense identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly sourceId: string;

  /**
   * Property sourceRevision
   * @readonly
   *
   * @description
   * Source revision retained for traceability.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly sourceRevision?: number | null;

  /**
   * Property amount
   * @readonly
   *
   * @description
   * Exact signed decimal amount, or unknown.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly amount?: string | null;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Organization currency.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Operational source description.
   *
   * @access public
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property occurredAt
   * @readonly
   *
   * @description
   * Original occurrence timestamp.
   *
   * @access public
   *
   * @type {string}
   */
  readonly occurredAt: string;

  /**
   * Property correctionOf
   * @readonly
   *
   * @description
   * Original contribution or closure reference corrected by this fact.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly correctionOf?: string | null;

  /**
   * Property hourlyAmount
   * @readonly
   *
   * @description
   * Exact hourly rate retained for a time contribution.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly hourlyAmount?: string | null;

  /**
   * Property rateId
   * @readonly
   *
   * @description
   * Applied immutable hourly rate identifier.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly rateId?: string | null;
}
