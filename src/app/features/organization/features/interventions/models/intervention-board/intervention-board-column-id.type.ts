/**
 * Type InterventionBoardColumnId
 *
 * @description
 * Identifies a pipeline-board lane. Lanes map onto the intervention workflow
 * statuses, with the single `review` lane fusing the `submitted` and
 * `changes_requested` statuses (both are "waiting for a reviewer"). The
 * terminal `abandoned` status has no lane and is surfaced elsewhere.
 *
 * @since 1.0.0
 */
export type InterventionBoardColumnId =
  | 'draft'
  | 'planned'
  | 'in_progress'
  | 'review'
  | 'published';
