export type {
  EquipmentOutput,
  EquipmentPlanPosition,
  EquipmentStatus,
  HistoricalEquipmentType,
  EquipmentCriticality,
  EquipmentTechnicalProperty,
} from './equipment/equipment-output.interface';
export type { CreateEquipmentInput } from './equipment/create-equipment-input.interface';
export type {
  ReplaceEquipmentInput,
  ReplaceEquipmentOutput,
  ReplacementEquipmentInput,
} from './equipment/replace-equipment-input.interface';
export type {
  EquipmentTypeOutput,
  EquipmentTypeOption,
  EquipmentFamily,
} from './equipment-type/equipment-type-output.interface';
export type { UpdateEquipmentInput } from './equipment/update-equipment-input.interface';
export type { EquipmentOpenWorkOutput } from './equipment/equipment-open-work-output.interface';
export type { EquipmentInspectionSummaryOutput } from './equipment/equipment-inspection-summary-output.interface';
export type { CreateEquipmentTypeInput } from './equipment-type/create-equipment-type-input.interface';
export type { UpdateEquipmentTypeInput } from './equipment-type/update-equipment-type-input.interface';
export type { AssignToFacilityInput } from './equipment/assign-to-facility-input.interface';
export type { SetPlanPositionInput } from './equipment/set-plan-position-input.interface';
export type { EquipmentMaintenanceDueStatus } from './equipment/equipment-maintenance-due-status.type';
export type { EquipmentAttachmentOutput } from './equipment-attachment/equipment-attachment-output.interface';
export type { AddAttachmentInput } from './equipment-attachment/add-attachment-input.interface';
export type { EquipmentTagOutput } from './equipment-tag/equipment-tag-output.interface';
export type { AddTagInput } from './equipment-tag/add-tag-input.interface';
export type {
  EquipmentMaintenanceLogOutput,
  EquipmentMaintenanceLogSource,
} from './equipment/equipment-maintenance-log-output.interface';
export type {
  EquipmentListSort,
  EquipmentSortField,
} from './equipment/equipment-list-sort.interface';
export type { EquipmentStatusTagDescriptor } from './equipment-status-tag/equipment-status-tag-descriptor.interface';
export type { EquipmentStatusTagKind } from './equipment-status-tag/equipment-status-tag-kind.type';
export type { EquipmentStatusTagSeverity } from './equipment-status-tag/equipment-status-tag-severity.type';
export { resolveEquipmentStatusTag } from './equipment-status-tag/equipment-status-tag.util';
export type { EquipmentEditState } from './equipment-edit/equipment-edit-state.interface';
export type { EquipmentEditTarget } from './equipment-edit/equipment-edit-target.type';
export type { EquipmentKpiOutput } from './equipment-kpi/equipment-kpi-output.interface';
export type { EquipmentFacilitySummaryOutput } from './equipment-summary/equipment-facility-summary-output.interface';
