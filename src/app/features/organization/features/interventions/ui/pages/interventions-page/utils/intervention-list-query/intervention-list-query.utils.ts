import type {
  InterventionDueWindow,
  InterventionListFilters,
  InterventionListOptions,
  InterventionListSort,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  INTERVENTION_DUE_WINDOW_OPTIONS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from '../../options/intervention-filter-options.constants';

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
 * @param {string | null} memberIri - The signed-in member's IRI, resolving the
 * `mine` narrowing to the API's `member` (responsible OR participant) filter;
 * `mine` is silently dropped while the profile has not resolved yet.
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
  memberIri: string | null = null,
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
  if (filters.label) options.label = filters.label;
  if (filters.mine && memberIri) options.member = memberIri;

  if (filters.dueWindow) {
    const bounds = resolveDueWindow(filters.dueWindow, now);
    if (bounds.dueAtAfter) options.dueAtAfter = bounds.dueAtAfter;
    if (bounds.dueAtBefore) options.dueAtBefore = bounds.dueAtBefore;
  }

  return options;
}

/**
 * The value of a query param when it names a known option, null otherwise —
 * an unknown or tampered value is dropped rather than sent to the API.
 */
function parseOption<T extends string>(
  raw: string | undefined,
  options: readonly SelectOption<T>[],
): T | null {
  return options.find((option: SelectOption<T>): boolean => option.value === raw)?.value ?? null;
}

/** The last path segment of an IRI, null in and null out. */
function lastIriSegment(iri: string | null): string | null {
  return iri === null ? null : (iri.split('/').pop() ?? null);
}

/**
 * Function parseInterventionListFilters
 *
 * @description
 * Rebuilds the active narrowing from the URL's query params — the reverse of
 * {@link serializeInterventionListFilters}. Enum-valued params are validated
 * against the filter option catalogs (an unknown value parses as unfiltered);
 * IRI-valued ones travel as raw ids and are rebuilt here.
 *
 * @param {object} raw - The raw query param values, undefined when absent.
 * @param {string} organizationId - The active organization, anchoring member IRIs.
 *
 * @returns {InterventionListFilters} The narrowing the URL expresses.
 *
 * @since 5.2.0
 */
export function parseInterventionListFilters(
  raw: {
    readonly status?: string;
    readonly type?: string;
    readonly priority?: string;
    readonly site?: string;
    readonly responsible?: string;
    readonly label?: string;
    readonly mine?: string;
    readonly due?: string;
  },
  organizationId: string,
): InterventionListFilters {
  return {
    status: parseOption(raw.status, INTERVENTION_STATUS_FILTER_OPTIONS),
    type: parseOption(raw.type, INTERVENTION_TYPE_FILTER_OPTIONS),
    priority: parseOption(raw.priority, INTERVENTION_PRIORITY_FILTER_OPTIONS),
    site: raw.site ? `/api/facilities/${raw.site}` : null,
    responsible: raw.responsible
      ? `/api/organizations/${organizationId}/members/${raw.responsible}`
      : null,
    label: raw.label ? `/api/intervention-labels/${raw.label}` : null,
    mine: raw.mine === '1',
    dueWindow: parseOption(raw.due, INTERVENTION_DUE_WINDOW_OPTIONS),
  };
}

/**
 * Function serializeInterventionListFilters
 *
 * @description
 * Turns the active narrowing into the query params that express it — null
 * removes the param from the URL, so a cleared filter leaves no residue. The
 * reverse of {@link parseInterventionListFilters}.
 *
 * @param {InterventionListFilters} filters - Active narrowing.
 *
 * @returns {Record<string, string | null>} Query params for `navigateQuery`.
 *
 * @since 5.2.0
 */
export function serializeInterventionListFilters(
  filters: InterventionListFilters,
): Record<string, string | null> {
  return {
    status: filters.status,
    type: filters.type,
    priority: filters.priority,
    site: lastIriSegment(filters.site),
    responsible: lastIriSegment(filters.responsible),
    label: lastIriSegment(filters.label),
    mine: filters.mine ? '1' : null,
    due: filters.dueWindow,
  };
}

/**
 * Function countActiveFilters
 *
 * @description
 * How many narrowings are in force, for the badge on the filters button.
 * Search is deliberately excluded: it has its own visible input — and so is
 * `mine`, whose toggle chip already shows its own state.
 *
 * @param {InterventionListFilters} filters - Active narrowing.
 *
 * @returns {number} Count of set filters.
 *
 * @since 1.0.0
 */
export function countActiveFilters(filters: InterventionListFilters): number {
  return Object.entries(filters).filter(
    ([key, value]) => key !== 'mine' && value !== null && value !== false,
  ).length;
}
