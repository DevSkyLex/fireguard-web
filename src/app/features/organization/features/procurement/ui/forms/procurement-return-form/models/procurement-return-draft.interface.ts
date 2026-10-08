/**
 * Interface ProcurementReturnDraft
 * @interface ProcurementReturnDraft
 *
 * @description
 * Editable exact return quantity and motivated physical explanation.
 */
export interface ProcurementReturnDraft {
  /**
   * Property quantity
   *
   * @description
   * Exact positive quantity text.
   *
   * @access public
   *
   * @type {string}
   */
  quantity: string;

  /**
   * Property reason
   *
   * @description
   * Reason retained with the physical source receipt.
   *
   * @access public
   *
   * @type {string}
   */
  reason: string;
}
