/**
 * Type PurchaseOrderStatus
 *
 * @description
 * Server-owned purchase lifecycle.
 *
 * @type {PurchaseOrderStatus}
 */
export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partial_received'
  | 'received'
  | 'cancelled';
