import type { CreateEquipmentInput } from './create-equipment-input.interface';

/**
 * Type UpdateEquipmentInput
 *
 * @description
 * Payload used to partially update an equipment
 * resource.
 */
export type UpdateEquipmentInput = Partial<CreateEquipmentInput>;
