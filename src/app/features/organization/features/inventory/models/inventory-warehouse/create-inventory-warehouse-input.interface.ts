/**
 * Interface CreateInventoryWarehouseInput
 * @interface CreateInventoryWarehouseInput
 *
 * @description
 * Creates a warehouse with a permanent code.
 *
 * @since unreleased
 */
export interface CreateInventoryWarehouseInput {
  /**
   * Property code
   * @readonly
   *
   * @description
   * Permanent unique organization code, limited to 100 characters.
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
   * Warehouse display name, limited to 255 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;
}
