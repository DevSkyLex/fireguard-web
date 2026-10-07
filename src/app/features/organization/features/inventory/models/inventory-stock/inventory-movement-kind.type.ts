/**
 * Type InventoryMovementKind
 *
 * @description
 * Canonical immutable stock movement categories.
 *
 * @type InventoryMovementKind
 */
export type InventoryMovementKind =
  | 'receipt'
  | 'receipt_return'
  | 'consumption'
  | 'return'
  | 'correction';
