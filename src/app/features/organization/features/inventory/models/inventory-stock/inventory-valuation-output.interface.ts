/**
 * Interface InventoryValuationOutput
 * @interface InventoryValuationOutput
 *
 * @description
 * Dedicated financial stock projection is never part of the ordinary quantity-only contract.
 *
 * @since unreleased
 */
export interface InventoryValuationOutput {
  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Exact internal average or movement unit cost when known.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly unitCost?: string | null;

  /**
   * Property totalValue
   * @readonly
   *
   * @description
   * Exact internal value or signed value delta when known.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly totalValue?: string | null;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Organization valuation currency.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property incomplete
   * @readonly
   *
   * @description
   * Unknown valuation remains explicit rather than being treated as zero.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly incomplete: boolean;
}
