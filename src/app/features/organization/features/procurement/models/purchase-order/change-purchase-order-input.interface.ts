import type { PurchaseOrderLineInput } from './purchase-order-line-input.interface';
/**
 * Interface ChangePurchaseOrderInput
 * @interface ChangePurchaseOrderInput
 *
 * @description
 * Internal purchase draft without taxes, payments or commercial prices.
 */
export interface ChangePurchaseOrderInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable purchase reference.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property supplierId
   * @readonly
   *
   * @description
   * Active internal supplier UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly supplierId: string;

  /**
   * Property lines
   * @readonly
   *
   * @description
   * Bounded draft lines retained until the server accepts the change.
   *
   * @access public
   *
   * @type {readonly PurchaseOrderLineInput[]}
   */
  readonly lines: readonly PurchaseOrderLineInput[];
}
