import type { EquipmentOutput } from './equipment-output.interface';

type EquipmentEditableFields = Pick<
  EquipmentOutput,
  'type' | 'subType' | 'brand' | 'model' | 'serialNumber' | 'locationLabel'
>;

export type CreateEquipmentInput = Pick<EquipmentEditableFields, 'type'> &
  Partial<Omit<EquipmentEditableFields, 'type'>>;
