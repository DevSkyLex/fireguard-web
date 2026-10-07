import type { HydraItem } from '@core/api/models';

/**
 * Interface MaintenanceRateOutput
 * @interface MaintenanceRateOutput
 *
 * @description
 * An immutable member hourly rate effective from an explicit local calendar date.
 */
export interface MaintenanceRateOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable rate UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Organization member UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property hourlyAmount
   * @readonly
   *
   * @description
   * Exact nonnegative hourly amount.
   *
   * @access public
   *
   * @type {string}
   */
  readonly hourlyAmount: string;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Common organization currency.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property effectiveFrom
   * @readonly
   *
   * @description
   * Effective calendar date in YYYY-MM-DD format.
   *
   * @access public
   *
   * @type {string}
   */
  readonly effectiveFrom: string;

  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Whether creation replayed the same stable declaration.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
