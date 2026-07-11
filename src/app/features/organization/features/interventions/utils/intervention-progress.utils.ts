import type { InterventionStatus } from '../models';

/**
 * Lifecycle completion percentage (0–100) for each workflow status, used to
 * fill the intervention progress ring.
 *
 * The ring reflects how far an intervention has advanced through its workflow
 * (draft → planned → in_progress → submitted → published) rather than work-item
 * completion, which is often empty early on. `changes_requested` sits just
 * below `submitted` (sent back for rework), `abandoned` reads as a terminal
 * empty ring.
 */
const LIFECYCLE_PROGRESS: Record<InterventionStatus, number> = {
  draft: 8,
  planned: 30,
  in_progress: 55,
  changes_requested: 65,
  submitted: 80,
  published: 100,
  abandoned: 0,
};

/**
 * Resolves the lifecycle progress percentage for an intervention status.
 *
 * @param status - The intervention workflow status.
 * @returns The completion percentage (0–100) to fill the progress ring with.
 */
export function interventionLifecycleProgress(status: InterventionStatus): number {
  return LIFECYCLE_PROGRESS[status] ?? 0;
}
