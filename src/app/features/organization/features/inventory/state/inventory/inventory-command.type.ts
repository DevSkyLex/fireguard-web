import type {
  CreateInventoryPartInput,
  CreateInventoryWarehouseInput,
  UpdateInventoryPartInput,
  UpdateInventoryWarehouseInput,
  InventoryPhysicalCommand,
} from '@features/organization/features/inventory/models';

/**
 * Type InventoryCommand
 *
 * @description
 * Scoped administration commands and durable physical stock intentions.
 *
 * @type InventoryCommand
 */
export type InventoryCommand =
  | InventoryPhysicalCommand
  | ({ readonly organizationId: string; readonly userId: string } & (
      | { readonly kind: 'createPart'; readonly input: CreateInventoryPartInput }
      | { readonly kind: 'createWarehouse'; readonly input: CreateInventoryWarehouseInput }
      | {
          readonly kind: 'updatePart';
          readonly id: string;
          readonly input: UpdateInventoryPartInput;
        }
      | {
          readonly kind: 'updateWarehouse';
          readonly id: string;
          readonly input: UpdateInventoryWarehouseInput;
        }
      | { readonly kind: 'reconcile'; readonly id: string }
    ));
