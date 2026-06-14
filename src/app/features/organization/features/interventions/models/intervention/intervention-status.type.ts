/**
 * Workflow status of a intervention from creation to publication.
 */
export type InterventionStatus =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'submitted'
  | 'changes_requested'
  | 'published'
  | 'abandoned';
