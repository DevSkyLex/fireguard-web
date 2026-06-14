/**
 * Workflow status of a mission from creation to publication.
 */
export type MissionStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'submitted'
  | 'changes_requested'
  | 'published'
  | 'abandoned';
