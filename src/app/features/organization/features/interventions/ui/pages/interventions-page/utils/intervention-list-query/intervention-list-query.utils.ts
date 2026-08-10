import type {
  InterventionDueWindow,
  InterventionListFilters,
  InterventionListOptions,
  InterventionListSort,
} from '@features/organization/features/interventions/models';

/**
 * Milliseconds in a day, for resolving the named due-date windows.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Function resolveDueWindow
 *
 * @description
 * Turns a named due-date window into the pair of ISO bounds that expresses it.
 * `overdue` is the only one that is open-ended below; the others start at the
 * instant asked and run forward.
 *
 * The instant is a parameter rather than read here so the function stays pure
 * and its spec stays deterministic.
 *
 * @param {InterventionDueWindow} window - The window to resolve.
 * @param {Date} now - Instant the window is anchored on.
 *
 * @returns {{ dueAtAfter?: string; dueAtBefore?: string }} The bounds to send.
 *
 * @since 1.0.0
 */
export function resolveDueWindow(
  window: InterventionDueWindow,
  now: Date,
): { readonly dueAtAfter?: string; readonly dueAtBefore?: string } {
  const at: string = now.toISOString();
  const forward = (days: number): string =>
    new Date(now.getTime() + days * MILLISECONDS_PER_DAY).toISOString();

  switch (window) {
    case 'overdue':
      return { dueAtBefore: at };
    case 'today':
      return { dueAtAfter: at, dueAtBefore: forward(1) };
    case 'week':
      return { dueAtAfter: at, dueAtBefore: forward(7) };
    case 'month':
      return { dueAtAfter: at, dueAtBefore: forward(30) };
  }
}

/**
 * Function buildInterventionListOptions
 *
 * @description
 * Folds the operator's narrowing and ordering into the query the collection
 * actually receives.
 *
 * A filter left unset is **omitted**, never sent empty: the API treats an empty
 * `status` as a value, not as "any". Search is folded in here too so the page
 * has one place that decides what goes on the wire.
 *
 * @param {InterventionListFilters} filters - Active narrowing.
 * @param {InterventionListSort} sort - Active ordering.
 * @param {string} search - Trimmed free-text search, empty when unused.
 * @param {Date} now - Instant the due-date windows are anchored on.
 *
 * @returns {InterventionListOptions} Options to hand the store.
 *
 * @since 1.0.0
 */
export function buildInterventionListOptions(
  filters: InterventionListFilters,
  sort: InterventionListSort,
  search: string,
  now: Date,
): InterventionListOptions {
  const options: {
    -readonly [Key in keyof InterventionListOptions]: InterventionListOptions[Key];
  } = { order: { [sort.field]: sort.direction } };

  if (search) options.name = search;
  if (filters.status) options.status = filters.status;
  if (filters.type) options.type = filters.type;
  if (filters.priority) options.priority = filters.priority;
  if (filters.site) options.site = filters.site;
  if (filters.responsible) options.responsible = filters.responsible;

  if (filters.dueWindow) {
    const bounds = resolveDueWindow(filters.dueWindow, now);
    if (bounds.dueAtAfter) options.dueAtAfter = bounds.dueAtAfter;
    if (bounds.dueAtBefore) options.dueAtBefore = bounds.dueAtBefore;
  }

  return options;
}

/**
 * Function countActiveFilters
 *
 * @description
 * How many narrowings are in force, for the badge on the filters button.
 * Search is deliberately excluded: it has its own visible input.
 *
 * @param {InterventionListFilters} filters - Active narrowing.
 *
 * @returns {number} Count of set filters.
 *
 * @since 1.0.0
 */
export function countActiveFilters(filters: InterventionListFilters): number {
  return Object.values(filters).filter((value) => value !== null).length;
}
