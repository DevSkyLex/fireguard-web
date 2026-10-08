/**
 * Interface ReceivePurchaseOrderInput
 * @interface ReceivePurchaseOrderInput
 *
 * @description
 * One bounded physical delivery with a stable operation UUID for response-loss replay.
 */
export interface ReceivePurchaseOrderInput {
  /**
   * Property lineId
   * @readonly
   *
   * @description
   * Source order-line UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly lineId: string;

  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Active warehouse for a stock line; omitted for individual equipment.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly warehouseId?: string | null;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Positive exact quantity, bounded by the source line on the server.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property receivedAt
   * @readonly
   *
   * @description
   * Actual receipt instant with an explicit offset.
   *
   * @access public
   *
   * @type {string}
   */
  readonly receivedAt: string;

  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID retained unchanged for an identical retry.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId: string;
}
