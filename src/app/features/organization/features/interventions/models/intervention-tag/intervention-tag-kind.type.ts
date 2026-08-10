/**
 * Type InterventionTagKind
 *
 * @description
 * Discriminator for every intervention enum that renders as a status
 * indicator.
 *
 * @since 1.0.0
 */
export type InterventionTagKind =
  | 'priority'
  | 'status'
  | 'type'
  | 'workItemAction'
  | 'workItemStatus'
  | 'issueSeverity'
  | 'changeStatus'
  | 'inspectionResult'
  | 'inspectionStatus'
  | 'facilityStatus'
  | 'equipmentStatus';
