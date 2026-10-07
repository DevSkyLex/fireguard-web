import type { HydraItem } from '@core/api/models';

/**
 * Interface InventoryWarehouseOutput
 * @interface InventoryWarehouseOutput
 *
 * @description
 * An organization-owned stock warehouse, distinct from equipment placement.
 *
 * @since unreleased
 */
export interface InventoryWarehouseOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable warehouse identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Permanent unique organization code.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Warehouse display name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Archived warehouses remain readable in movement histories.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly archived: boolean;
}
