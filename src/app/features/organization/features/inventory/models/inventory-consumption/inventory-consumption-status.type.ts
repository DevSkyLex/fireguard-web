/**
 * Type InventoryConsumptionStatus
 *
 * @description
 * Canonical server stock-confirmation states, separate from local queuing and work completion.
 *
 * @type InventoryConsumptionStatus
 */
export type InventoryConsumptionStatus = 'confirmed' | 'received_pending';

/**
 * Type InventoryConsumptionReason
 *
 * @description
 * Canonical reconciliation causes returned by the server.
 *
 * @type InventoryConsumptionReason
 */
export type InventoryConsumptionReason =
  | 'missing_balance'
  | 'archived_reference'
  | 'insufficient_stock';
