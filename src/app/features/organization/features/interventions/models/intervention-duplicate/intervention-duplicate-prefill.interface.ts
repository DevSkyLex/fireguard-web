import type { InterventionPriority } from '../intervention/intervention-priority.type';
import type { InterventionType } from '../intervention/intervention-type.type';

/**
 * Interface InterventionDuplicatePrefill
 * @interface InterventionDuplicatePrefill
 *
 * @description
 * What "Duplicate" hands the creation sheet: the same fields
 * `InterventionCreateFormValues` (`ui/forms/intervention-create-form`) owns,
 * minus the planned window. It never carries `status`, `plannedStartAt`,
 * `dueAt` or `reviewNote` — a duplicate is a fresh draft, not a copy of the
 * source intervention's lifecycle.
 *
 * Declared here rather than derived from `InterventionCreateFormValues`
 * because `models/` may not depend on `ui/` (`ARCHITECTURE.md` dependency
 * direction); the two are kept structurally identical by hand instead.
 *
 * @since 1.0.0
 */
export interface InterventionDuplicatePrefill {
  /** What to call the duplicate, already suffixed. */
  readonly name: string;

  /** What the duplicate prepares. */
  readonly type: InterventionType;

  /** How urgent the duplicate is. */
  readonly priority: InterventionPriority;

  /** IRI of the site it concerns, or an empty string. */
  readonly site: string;

  /** IRI of the responsible member, or an empty string. */
  readonly responsible: string;
}
