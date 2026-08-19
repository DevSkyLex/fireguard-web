import type { InterventionPriority } from '../intervention/intervention-priority.type';
import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionType } from '../intervention/intervention-type.type';
import type { InterventionDueRangeFilter } from './intervention-due-range-filter.type';
import type { InterventionPlannedStartRangeFilter } from './intervention-planned-start-range-filter.type';

/**
 * Interface InterventionListFilters
 * @interface InterventionListFilters
 *
 * @description
 * The narrowing an operator has applied to the interventions collection.
 *
 * Every field maps to a real query parameter the API already accepts — the page
 * used to send none of them. `null` means "not filtered", never "filter on
 * nothing": an absent field is dropped before the request rather than sent
 * empty.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionListFilters {
  //#region Properties
  /**
   * Workflow status: a single value under the chip's `equals` operator, a
   * readonly array under `isAnyOf` (OR-combined server side), `null` when
   * unfiltered. Which shape is active discriminates the operator — there is
   * no separate operator field for these six, matching how the page already
   * modelled them before `isAnyOf` existed.
   */
  readonly status: InterventionStatus | readonly InterventionStatus[] | null;

  /** Workflow type. See {@link status}. */
  readonly type: InterventionType | readonly InterventionType[] | null;

  /** Priority. See {@link status}. */
  readonly priority: InterventionPriority | readonly InterventionPriority[] | null;

  /** IRI(s) of the site(s) the intervention concerns. See {@link status}. */
  readonly site: string | readonly string[] | null;

  /** IRI(s) of the responsible agent(s). See {@link status}. */
  readonly responsible: string | readonly string[] | null;

  /** IRI(s) of the intervention label(s) the collection is narrowed to. See {@link status}. */
  readonly label: string | readonly string[] | null;

  /**
   * "My interventions" — matches the signed-in member as responsible OR
   * participant, via the API's `member` filter. `false` means not narrowed,
   * and never counts as an active filter.
   */
  readonly mine: boolean;

  /**
   * Named due-date window, resolved to `dueAtAfter`/`dueAtBefore` bounds.
   * Legacy-preset only: the segmented views and the Today page's deep link
   * are its only writers now — the filter bar's "Deadline" chip narrows
   * through {@link dueRange} instead (`FEATURE.md`).
   */
  readonly dueWindow: InterventionDueWindow | null;

  /**
   * The filter bar's "Deadline" chip narrowing — a real `greaterThan` /
   * `lessThan` / `between` date bound, independent of {@link dueWindow}.
   * Both resolve into the same `dueAtAfter`/`dueAtBefore` API bounds and
   * combine (tightened, never widened) when both happen to be active at
   * once.
   */
  readonly dueRange: InterventionDueRangeFilter | null;

  /**
   * The filter bar's "Planned start" chip narrowing — the same
   * `greaterThan`/`lessThan`/`between` shape as {@link dueRange}, mapped to
   * `plannedStartAtAfter`/`plannedStartAtBefore` instead. No legacy preset
   * writes this field — unlike {@link dueWindow}, nothing else narrows by
   * planned start today, so the mapping is direct.
   */
  readonly plannedStartRange: InterventionPlannedStartRangeFilter | null;
  //#endregion
}

/**
 * Type InterventionDueWindow
 *
 * @description
 * The due-date questions worth a one-click answer. Each resolves to a pair of
 * ISO bounds at request time, so the window means the same thing whichever day
 * it is asked on.
 *
 * - `overdue` — already past due,
 * - `today` — due before tomorrow and not yet past,
 * - `week` — due within the next seven days,
 * - `month` — due within the next thirty days.
 *
 * @since 1.0.0
 */
export type InterventionDueWindow = 'overdue' | 'today' | 'week' | 'month';
