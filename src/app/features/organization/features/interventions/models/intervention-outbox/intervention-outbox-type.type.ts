/**
 * Type InterventionOutboxType
 * @type InterventionOutboxType
 *
 * @description
 * Supported operation types queued in the intervention offline outbox.
 *
 * @version 1.0.0
 */
export type InterventionOutboxType =
  | 'facility.create'
  | 'equipment.create'
  | 'inspection.create'
  | 'media.create'
  | 'attachment.upload'
  | 'comment.create'
  | 'intervention.update'
  | 'work-item.create'
  | 'work-item.update'
  | 'time-entry.create'
  | 'time-entry.correct'
  | 'time-entry.cancel'
  | 'change.create'
  | 'change.update';
