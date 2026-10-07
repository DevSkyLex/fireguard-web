/**
 * Interface CorrectInventoryStockInput
 * @interface CorrectInventoryStockInput
 *
 * @description
 * A motivated stock adjustment creates a new signed movement and requires financial management
 * permission.
 *
 * @since unreleased
 */
export interface CorrectInventoryStockInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID preserved through command retries.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property partId
   * @readonly
   *
   * @description
   * Reference whose balance is being adjusted.
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
   * Warehouse whose balance is being adjusted.
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
   * Nonzero exact signed delta, with at most six fractional digits.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Recorded factual adjustment reason, limited to 2000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly reason: string;

  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Optional exact internal unit cost; omitted when unknown.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly unitCost?: string | null;
}
