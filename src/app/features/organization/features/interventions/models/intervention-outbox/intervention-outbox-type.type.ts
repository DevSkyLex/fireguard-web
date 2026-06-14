/**
 * Supported operation types queued in the intervention offline outbox.
 */
export type InterventionOutboxType =
  | 'facility.create'
  | 'equipment.create'
  | 'inspection.create'
  | 'media.create'
  | 'intervention.update'
  | 'work-item.create'
  | 'work-item.update'
  | 'change.create'
  | 'change.update';
