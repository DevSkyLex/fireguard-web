/**
 * Discriminator for every intervention enum that renders as a status indicator
 * (badge or select option).
 */
export type InterventionTagKind =
  | 'priority'
  | 'status'
  | 'type'
  | 'workItemAction'
  | 'workItemStatus'
  | 'issueSeverity'
  | 'changeStatus'
  | 'inspectionResult';
