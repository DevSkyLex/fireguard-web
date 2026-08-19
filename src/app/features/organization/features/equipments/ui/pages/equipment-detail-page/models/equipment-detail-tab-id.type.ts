/**
 * Type EquipmentDetailTabId
 *
 * @description
 * Which of the equipment record's four tabs is showing: `overview` (the
 * identification fields, `EquipmentInformationPanel`), `attachments`
 * (`EquipmentAttachments`), `maintenance` (the read-only history,
 * `EquipmentMaintenanceHistory`), or `tags` (`EquipmentTags`).
 *
 * @since 1.5.0
 */
export type EquipmentDetailTabId = 'overview' | 'attachments' | 'maintenance' | 'tags';
