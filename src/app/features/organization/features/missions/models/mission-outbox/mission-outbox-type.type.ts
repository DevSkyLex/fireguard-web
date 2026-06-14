/**
 * Supported operation types queued in the mission offline outbox.
 */
export type MissionOutboxType =
  | 'facility.create'
  | 'equipment.create'
  | 'inspection.create'
  | 'media.create'
  | 'mission.update'
  | 'work-item.create'
  | 'work-item.update'
  | 'change.create'
  | 'change.update';
