/**
 * Interface MaintenanceEstimatedResource
 * @interface MaintenanceEstimatedResource
 *
 * @description
 * An explicit forecast resource; missing amounts remain unknown.
 */
export interface MaintenanceEstimatedResource {
  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Optional operational task reference.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly workItemId?: string | null;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Resource category defining server valuation.
   *
   * @access public
   *
   * @type {'time' | 'material' | 'external'}
   */
  readonly kind: 'time' | 'material' | 'external';

  /**
   * Property description
   * @readonly
   *
   * @description
   * Human-readable forecast purpose.
   *
   * @access public
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact decimal quantity.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly quantity?: string | null;

  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Exact unit cost or hourly cost for time.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly unitCost?: string | null;

  /**
   * Property estimatedMinutes
   * @readonly
   *
   * @description
   * Estimated integral time in minutes.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly estimatedMinutes?: number | null;

  /**
   * Property amount
   * @readonly
   *
   * @description
   * Explicit or server-derived exact estimated amount.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly amount?: string | null;
}
