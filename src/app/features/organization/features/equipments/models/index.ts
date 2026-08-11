export type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from './equipment/equipment-output.interface';
export type { CreateEquipmentInput } from './equipment/create-equipment-input.interface';
export type { UpdateEquipmentInput } from './equipment/update-equipment-input.interface';
export type { AssignToFacilityInput } from './equipment/assign-to-facility-input.interface';
export type { EquipmentMaintenanceDueStatus } from './equipment/equipment-maintenance-due-status.type';
export type { EquipmentAttachmentOutput } from './equipment-attachment/equipment-attachment-output.interface';
export type { AddAttachmentInput } from './equipment-attachment/add-attachment-input.interface';
export type { EquipmentTagOutput } from './equipment-tag/equipment-tag-output.interface';
export type { AddTagInput } from './equipment-tag/add-tag-input.interface';
export type { EquipmentMaintenanceLogOutput } from './equipment/equipment-maintenance-log-output.interface';
export type { EquipmentStatusTagDescriptor } from './equipment-status-tag/equipment-status-tag-descriptor.interface';
export type { EquipmentStatusTagKind } from './equipment-status-tag/equipment-status-tag-kind.type';
export type { EquipmentStatusTagSeverity } from './equipment-status-tag/equipment-status-tag-severity.type';
export { resolveEquipmentStatusTag } from './equipment-status-tag/equipment-status-tag.util';
export type { EquipmentEditState } from './equipment-edit/equipment-edit-state.interface';
export type { EquipmentEditTarget } from './equipment-edit/equipment-edit-target.type';
