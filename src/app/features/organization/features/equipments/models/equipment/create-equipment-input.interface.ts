import type { EquipmentOutput } from './equipment-output.interface';

type EquipmentEditableFields = Pick<
  EquipmentOutput,
  'type' | 'subType' | 'brand' | 'model' | 'serialNumber' | 'locationLabel'
>;

/**
 * Type CreateEquipmentInput
 *
 * @description
 * Payload used to create an equipment resource
 * within an organization.
 */
export type CreateEquipmentInput = Pick<EquipmentEditableFields, 'type'> &
  Partial<Omit<EquipmentEditableFields, 'type'>>;
