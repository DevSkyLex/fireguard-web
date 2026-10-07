/**
 * Interface UpdateInventoryWarehouseInput
 * @interface UpdateInventoryWarehouseInput
 *
 * @description
 * Only the display name and archive state of an existing warehouse can change.
 *
 * @since unreleased
 */
export interface UpdateInventoryWarehouseInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Optional replacement display name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly name?: string;

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Optional archive or restoration intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly archived?: boolean;
}
