/**
 * Interface ReturnProcurementReceiptInput
 * @interface ReturnProcurementReceiptInput
 *
 * @description
 * Motivated physical return linked to the retained original receipt.
 */
export interface ReturnProcurementReceiptInput {
  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Positive exact returned quantity.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Human-readable physical return reason.
   *
   * @access public
   *
   * @type {string}
   */
  readonly reason: string;

  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID retained across identical retries.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId: string;
}
