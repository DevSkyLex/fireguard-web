import type { ReturnInventoryConsumptionInput } from '../inventory-consumption/return-inventory-consumption-input.interface';
import type { CorrectInventoryStockInput } from './correct-inventory-stock-input.interface';

/**
 * Type InventoryPhysicalCommand
 *
 * @description
 * Durable immutable intention for a return or a signed stock correction.
 *
 * @type InventoryPhysicalCommand
 */
export type InventoryPhysicalCommand =
  | {
      readonly kind: 'correction';
      readonly organizationId: string;
      readonly userId: string;
      readonly input: CorrectInventoryStockInput;
    }
  | {
      readonly kind: 'return';
      readonly organizationId: string;
      readonly userId: string;
      readonly input: ReturnInventoryConsumptionInput;
    };
