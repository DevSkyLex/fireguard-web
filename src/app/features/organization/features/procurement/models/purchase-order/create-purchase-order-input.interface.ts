import type { ChangePurchaseOrderInput } from './change-purchase-order-input.interface';

/**
 * Interface CreatePurchaseOrderInput
 * @interface CreatePurchaseOrderInput
 *
 * @description
 * Internal purchase draft creation with an optional operation UUID for safe transport replay.
 */
export interface CreatePurchaseOrderInput extends ChangePurchaseOrderInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable command UUID retained when retrying the same purchase draft creation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId?: string;
}
