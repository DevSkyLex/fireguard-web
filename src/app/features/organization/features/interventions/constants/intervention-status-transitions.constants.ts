import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_STATUS_TRANSITIONS
 * @const INTERVENTION_STATUS_TRANSITIONS
 *
 * @description
 * Allowed forward and backward status transitions, mirroring the backend
 * `InterventionTransitionPolicy`. The frontend uses this map to gate
 * drag-and-drop drops and to build the per-card action menu so the UI never
 * offers a transition the API would reject. `published` is intentionally
 * absent from every list: it is reached through the publication flow
 * (`/api/publications`), not a plain status update. `submitted` offers
 * `in_progress` (withdrawal) — the backend reserves it to the responsible
 * member and answers 403 for anyone else.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<InterventionStatus, readonly InterventionStatus[]>>}
 */
export const INTERVENTION_STATUS_TRANSITIONS: Readonly<
  Record<InterventionStatus, readonly InterventionStatus[]>
> = {
  draft: ['planned', 'abandoned'],
  planned: ['in_progress', 'abandoned'],
  in_progress: ['submitted', 'abandoned'],
  submitted: ['changes_requested', 'in_progress'],
  changes_requested: ['in_progress', 'submitted', 'abandoned'],
  published: [],
  abandoned: [],
};
