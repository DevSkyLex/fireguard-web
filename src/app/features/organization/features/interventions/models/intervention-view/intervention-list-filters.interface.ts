import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionType } from '../intervention/intervention-type.type';

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
  /** Single workflow status. The API filters one at a time. */
  readonly status: InterventionStatus | null;

  /** Single workflow type. */
  readonly type: InterventionType | null;

  /** IRI of the site the intervention concerns. */
  readonly site: string | null;

  /** IRI of the responsible agent. */
  readonly responsible: string | null;

  /** Named due-date window, resolved to `dueAtAfter`/`dueAtBefore` bounds. */
  readonly dueWindow: InterventionDueWindow | null;
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
