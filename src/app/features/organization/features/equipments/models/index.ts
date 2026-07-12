export type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from './equipment/equipment-output.interface';
export type { CreateEquipmentInput } from './equipment/create-equipment-input.interface';
export type { UpdateEquipmentInput } from './equipment/update-equipment-input.interface';
export type { AssignToFacilityInput } from './equipment/assign-to-facility-input.interface';
export type { EquipmentAttachmentOutput } from './equipment-attachment/equipment-attachment-output.interface';
export type { AddAttachmentInput } from './equipment-attachment/add-attachment-input.interface';
export type { EquipmentTagOutput } from './equipment-tag/equipment-tag-output.interface';
export type { AddTagInput } from './equipment-tag/add-tag-input.interface';
export type { EquipmentMaintenanceLogOutput } from './equipment/equipment-maintenance-log-output.interface';
export type { EquipmentTagDescriptor } from './equipment-status-tag/equipment-tag-descriptor.interface';
export type { EquipmentTagKind } from './equipment-status-tag/equipment-tag-kind.type';
export {
  resolveEquipmentTag,
  equipmentTagOptions,
} from './equipment-status-tag/equipment-tag.util';
