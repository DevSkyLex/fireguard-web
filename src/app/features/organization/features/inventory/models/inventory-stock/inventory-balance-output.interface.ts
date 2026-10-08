import type { HydraItem } from '@core/api/models';

/**
 * Interface InventoryBalanceOutput
 * @interface InventoryBalanceOutput
 *
 * @description
 * Ordinary inventory balance projection contains quantities only, without financial fields.
 *
 * @since unreleased
 */
export interface InventoryBalanceOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable stock balance identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property partId
   * @readonly
   *
   * @description
   * Quantitative reference whose stock is tracked.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly partId: string;

  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Warehouse holding this balance.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly warehouseId: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact nonnegative decimal quantity, serialized with six fractional digits.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;
}
