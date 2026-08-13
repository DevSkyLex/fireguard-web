import type {
  InterventionWorkItemFilter,
  InterventionWorkItemOutput,
  InterventionWorkItemStatus,
} from '@features/organization/features/interventions/models';

/**
 * Constant FILTER_STATUSES
 * @const FILTER_STATUSES
 *
 * @description
 * The work-item statuses each filter chip admits. `all` has no entry — it
 * short-circuits before this map is consulted.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<Exclude<InterventionWorkItemFilter, 'all'>, readonly InterventionWorkItemStatus[]>>}
 */
const FILTER_STATUSES: Readonly<
  Record<Exclude<InterventionWorkItemFilter, 'all'>, readonly InterventionWorkItemStatus[]>
> = {
  remaining: ['planned', 'in_progress'],
  done: ['completed'],
  skipped: ['skipped'],
};

/**
 * Function filterAndGroupInterventionWorkItems
 *
 * @description
 * Narrows the work-item table's rows to one filter chip, then — only when a
 * member id is given — moves that member's own rows first, keeping the
 * filtered order stable within each half. The caller decides whether "mine
 * first" applies by passing `null` when the toggle is off, so this stays the
 * one function both the row list and the chip counts read.
 *
 * @since 1.0.0
 *
 * @param {readonly InterventionWorkItemOutput[]} items - The intervention's full work-item scope.
 * @param {InterventionWorkItemFilter} filter - The active chip.
 * @param {string | null} memberId - The signed-in member's IRI to surface first, or `null` to skip grouping.
 *
 * @return {readonly InterventionWorkItemOutput[]} The filtered, optionally regrouped rows.
 */
export function filterAndGroupInterventionWorkItems(
  items: readonly InterventionWorkItemOutput[],
  filter: InterventionWorkItemFilter,
  memberId: string | null,
): readonly InterventionWorkItemOutput[] {
  const filtered: readonly InterventionWorkItemOutput[] =
    filter === 'all'
      ? items
      : items.filter((item) => FILTER_STATUSES[filter].includes(item.status));

  if (memberId === null) return filtered;

  const mine: InterventionWorkItemOutput[] = [];
  const others: InterventionWorkItemOutput[] = [];
  for (const item of filtered) {
    (item.assignee === memberId ? mine : others).push(item);
  }

  return [...mine, ...others];
}
