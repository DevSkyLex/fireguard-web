/**
 * Interface ProcurementReceiptDraft
 * @interface ProcurementReceiptDraft
 *
 * @description
 * Editable delivery values before the user declares one physical event.
 */
export interface ProcurementReceiptDraft {
  /**
   * Property quantity
   *
   * @description
   * Exact quantity text.
   *
   * @access public
   *
   * @type {string}
   */
  quantity: string;

  /**
   * Property warehouseId
   *
   * @description
   * Server-authorized receiving warehouse for stock articles.
   *
   * @access public
   *
   * @type {string}
   */
  warehouseId: string;

  /**
   * Property localTime
   *
   * @description
   * Device-local wall time from the native calendar control.
   *
   * @access public
   *
   * @type {string}
   */
  localTime: string;
  /**
   * Property offsetChoice
   *
   * @description
   * Explicit device UTC offset when a repeated local hour identifies two physical instants.
   *
   * @access public
   *
   * @type {string}
   */
  offsetChoice: string;
}
