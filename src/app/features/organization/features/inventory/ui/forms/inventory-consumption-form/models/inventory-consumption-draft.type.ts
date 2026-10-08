import type { DeclareInventoryConsumptionInput } from '@features/organization/features/inventory/models';

/**
 * Type InventoryConsumptionDraft
 *
 * @description
 * Exact consumption fields edited locally before the owner assigns operation identity and context.
 *
 * @type InventoryConsumptionDraft
 */
export type InventoryConsumptionDraft = Pick<
  DeclareInventoryConsumptionInput,
  'partId' | 'warehouseId' | 'quantity'
>;
