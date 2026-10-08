import type { HydraItem } from '@core/api/models';

/**
 * Interface MaintenanceCurrencyOutput
 * @interface MaintenanceCurrencyOutput
 *
 * @description
 * The organization currency becomes immutable after its first financial fact.
 */
export interface MaintenanceCurrencyOutput extends HydraItem {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Three-letter uppercase currency code.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property locked
   * @readonly
   *
   * @description
   * Whether operational financial facts have locked currency changes.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly locked: boolean;
}
