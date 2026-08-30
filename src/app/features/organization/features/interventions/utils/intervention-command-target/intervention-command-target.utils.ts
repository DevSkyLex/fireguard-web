import type {
  InterventionStatus,
  InterventionTransitionSubject,
} from '@features/organization/features/interventions/models';
import { resolveAllowedTransitions } from '../intervention-status-transition/intervention-status-transition.utils';

/**
 * Where each status sits on the forward lifecycle line. `changes_requested`
 * shares `in_progress`'s rung on purpose: a review verdict does not move the
 * card backwards, it returns it to the execute phase at the same position, so
 * "resubmit" stays forward of it and "resume work" does not.
 *
 * `abandoned` is absent: it is terminal and lateral, never a forward command.
 */
const FORWARD_RANK: Partial<Record<InterventionStatus, number>> = {
  draft: 0,
  planned: 1,
  in_progress: 2,
  changes_requested: 2,
  submitted: 3,
  published: 4,
};

/**
 * Function resolveCommandTransitionTarget
 *
 * @description
 * The status the intervention's one forward command moves it to: the nearest
 * workflow-legal status strictly ahead of where it is now, or `null` when
 * nothing lies ahead — which is how the caller knows the next step is the
 * publication flow rather than a status write.
 *
 * Derived from {@link resolveAllowedTransitions}, i.e. from the API's own
 * per-card policy, **not** from the workflow phase. Deriving it from the phase
 * put `planned` in `execute` and therefore computed `submitted`, a transition
 * the server refuses from `planned`: the band offered "Submit for review" when
 * the real next step was starting the field work, and the only path to
 * `in_progress` was three levels deep in the shell's overflow menu.
 *
 * @param {InterventionTransitionSubject} intervention - Intervention to resolve.
 *
 * @returns {InterventionStatus | null} The forward target, or `null` when there is none.
 *
 * @since 1.0.0
 */
export function resolveCommandTransitionTarget(
  intervention: InterventionTransitionSubject,
): InterventionStatus | null {
  const from: number | undefined = FORWARD_RANK[intervention.status];
  if (from === undefined) return null;

  return (
    resolveAllowedTransitions(intervention)
      .filter((status) => (FORWARD_RANK[status] ?? -1) > from)
      .toSorted((left, right) => (FORWARD_RANK[left] ?? 0) - (FORWARD_RANK[right] ?? 0))[0] ?? null
  );
}
