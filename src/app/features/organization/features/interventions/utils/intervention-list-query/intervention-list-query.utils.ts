import type {
  InterventionDueRangeFilter,
  InterventionDueWindow,
  InterventionExportOptions,
  InterventionListFilters,
  InterventionListOptions,
  InterventionListSort,
  InterventionPlannedStartRangeFilter,
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
 * Turns a named due-date window into the query fragment that expresses it.
 * The forward windows resolve to ISO bound pairs anchored on the instant
 * asked. `overdue` resolves to the server-side `due=overdue` preset instead
 * of a bare upper bound: the backend pairs the past-due check with the
 * non-terminal status exclusion the statistics endpoint uses, so the KPI
 * tile and the list it opens count the same set.
 *
 * The instant is a parameter rather than read here so the function stays pure
 * and its spec stays deterministic.
 *
 * @param {InterventionDueWindow} window - The window to resolve.
 * @param {Date} now - Instant the window is anchored on.
 *
 * @returns {{ due?: 'overdue'; dueAtAfter?: string; dueAtBefore?: string }} The query fragment to send.
 *
 * @since 1.0.0
 */
export function resolveDueWindow(
  window: InterventionDueWindow,
  now: Date,
): { readonly due?: 'overdue'; readonly dueAtAfter?: string; readonly dueAtBefore?: string } {
  const at: string = now.toISOString();
  const forward = (days: number): string =>
    new Date(now.getTime() + days * MILLISECONDS_PER_DAY).toISOString();

  switch (window) {
    case 'overdue':
      return { due: 'overdue' };
    case 'today':
      return { dueAtAfter: at, dueAtBefore: forward(1) };
    case 'week':
      return { dueAtAfter: at, dueAtBefore: forward(7) };
    case 'month':
      return { dueAtAfter: at, dueAtBefore: forward(30) };
  }
}

/**
 * Function hasEnumValue
 *
 * @description
 * Narrows one of the six `equals`/`isAnyOf` filter fields away from `null`
 * (unfiltered) and an empty array (emptied back to unfiltered by
 * {@link applyEnumFilter}-style clearing, kept out of the request the same
 * way `null` is) — what is left is a real scalar or a non-empty readonly
 * array, either way forwarded to {@link InterventionListOptions} as-is.
 *
 * @template T - The field's own value type (`InterventionStatus`, a raw IRI, …).
 *
 * @param {T | readonly T[] | null} value - The filter field's current value.
 *
 * @returns {value is T | readonly T[]} Whether the field is actually narrowing anything.
 *
 * @since 8.3.0
 */
function hasEnumValue<T>(value: T | readonly T[] | null): value is T | readonly T[] {
  return Array.isArray(value) ? value.length > 0 : value !== null;
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
  if (hasEnumValue(filters.status)) options.status = filters.status;
  if (hasEnumValue(filters.type)) options.type = filters.type;
  if (hasEnumValue(filters.priority)) options.priority = filters.priority;
  if (hasEnumValue(filters.site)) options.site = filters.site;
  if (hasEnumValue(filters.responsible)) options.responsible = filters.responsible;
  if (hasEnumValue(filters.label)) options.label = filters.label;
  if (filters.mine && memberIri) options.member = memberIri;

  if (filters.dueWindow) {
    const bounds = resolveDueWindow(filters.dueWindow, now);
    if (bounds.due) options.due = bounds.due;
    if (bounds.dueAtAfter) options.dueAtAfter = bounds.dueAtAfter;
    if (bounds.dueAtBefore) options.dueAtBefore = bounds.dueAtBefore;
  }

  if (filters.dueRange) {
    const range: InterventionDueRangeFilter = filters.dueRange;
    if (range.operator === 'greaterThan' || range.operator === 'between') {
      options.dueAtAfter = laterOf(options.dueAtAfter, range.after.toISOString());
    }
    if (range.operator === 'lessThan' || range.operator === 'between') {
      options.dueAtBefore = earlierOf(options.dueAtBefore, range.before.toISOString());
    }
  }

  if (filters.plannedStartRange) {
    const range: InterventionPlannedStartRangeFilter = filters.plannedStartRange;
    if (range.operator === 'greaterThan' || range.operator === 'between') {
      options.plannedStartAtAfter = range.after.toISOString();
    }
    if (range.operator === 'lessThan' || range.operator === 'between') {
      options.plannedStartAtBefore = range.before.toISOString();
    }
  }

  return options;
}

/**
 * The {@link InterventionListOptions} keys the CSV export endpoint accepts —
 * see {@link InterventionExportOptions}. Kept local rather than derived from
 * the type itself: a `Pick` alias carries no runtime key list.
 */
const EXPORTABLE_OPTION_KEYS: ReadonlySet<string> = new Set([
  'name',
  'status',
  'type',
  'priority',
  'site',
  'responsible',
  'due',
  'dueAtAfter',
  'dueAtBefore',
]);

/**
 * Function buildInterventionExportOptions
 *
 * @description
 * Narrows {@link buildInterventionListOptions}'s result to
 * {@link InterventionExportOptions} — the keys the CSV export endpoint
 * accepts — dropping `order`/`page`/`itemsPerPage` (a listing concern the
 * export has no use for) and any active filter the endpoint does not serve
 * (`member`, a `plannedStartAt*` bound, …). `droppedFilterCount` tells the
 * caller how many of those were actually in force, so it can warn only when
 * the export is narrower than the screen the operator is looking at.
 *
 * @param {InterventionListFilters} filters - Active narrowing.
 * @param {InterventionListSort} sort - Active ordering, dropped from the result.
 * @param {string} search - Trimmed free-text search, empty when unused.
 * @param {Date} now - Instant the due-date windows are anchored on.
 * @param {string | null} memberIri - See {@link buildInterventionListOptions}.
 *
 * @returns {{ readonly options: InterventionExportOptions; readonly droppedFilterCount: number }}
 * The exportable options, plus how many active filters were left out.
 *
 * @since 8.4.0
 */
export function buildInterventionExportOptions(
  filters: InterventionListFilters,
  sort: InterventionListSort,
  search: string,
  now: Date,
  memberIri: string | null = null,
): { readonly options: InterventionExportOptions; readonly droppedFilterCount: number } {
  const full: InterventionListOptions = buildInterventionListOptions(
    filters,
    sort,
    search,
    now,
    memberIri,
  );
  const options: Record<string, unknown> = {};
  let droppedFilterCount = 0;

  for (const [key, value] of Object.entries(full)) {
    if (key === 'order' || key === 'page' || key === 'itemsPerPage') continue;
    if (EXPORTABLE_OPTION_KEYS.has(key)) {
      options[key] = value;
    } else {
      droppedFilterCount += 1;
    }
  }

  return { options: options as InterventionExportOptions, droppedFilterCount };
}

/**
 * The later (more restrictive as a lower bound) of an already-set
 * `dueAtAfter` and a newly resolved one — ISO 8601 instants compare
 * chronologically as plain strings. Lets `dueWindow` (the segmented views'
 * legacy preset) and `dueRange` (the filter bar's own operator) combine into
 * the tightest bound when both happen to be active at once, rather than one
 * silently overwriting the other.
 */
function laterOf(existing: string | undefined, next: string): string {
  return existing && existing > next ? existing : next;
}

/** The earlier of an already-set `dueAtBefore` and a newly resolved one. See {@link laterOf}. */
function earlierOf(existing: string | undefined, next: string): string {
  return existing && existing < next ? existing : next;
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

/**
 * Function parseOptionSet
 *
 * @description
 * The `isAnyOf`/`equals` counterpart of {@link parseOption}: a raw param may
 * carry several comma-separated values (`?status=draft,planned`, the
 * "isAnyOf" chip's own URL shape) or the legacy single value
 * (`?status=draft`) unchanged. Each candidate is validated the same way
 * {@link parseOption} validates one; an unknown value is dropped from the
 * set rather than sent to the API. A single surviving value collapses back
 * to a scalar — so a bookmarked `?status=draft` still round-trips to the
 * exact `equals` shape it always has, never a one-element array — and no
 * surviving value parses as unfiltered, matching {@link parseOption}.
 *
 * @template T - The option's own literal type.
 *
 * @param {string | undefined} raw - The raw, possibly comma-separated, query param value.
 * @param {readonly SelectOption<T>[]} options - The field's known option catalog.
 *
 * @returns {T | readonly T[] | null} A scalar for one surviving value, an array for several, `null` for none.
 *
 * @since 8.3.0
 */
function parseOptionSet<T extends string>(
  raw: string | undefined,
  options: readonly SelectOption<T>[],
): T | readonly T[] | null {
  if (!raw) return null;

  const values: T[] = raw
    .split(',')
    .map((candidate: string): T | null => parseOption(candidate, options))
    .filter((value: T | null): value is T => value !== null);

  if (values.length === 0) return null;
  return values.length === 1 ? values[0] : values;
}

/**
 * Function parseIriSet
 *
 * @description
 * The IRI-valued counterpart of {@link parseOptionSet} — {@link status}'s raw
 * ids are validated against a catalog, an IRI field's raw ids are only ever
 * rebuilt into IRIs, never validated against one (the same trust level
 * {@link parseInterventionListFilters}'s single-valued IRI parsing already
 * carries).
 *
 * @param {string | undefined} raw - The raw, possibly comma-separated, query param value — bare ids, never full IRIs.
 * @param {(id: string) => string} toIri - Rebuilds one raw id into its full IRI.
 *
 * @returns {string | readonly string[] | null} A scalar for one id, an array for several, `null` for none.
 *
 * @since 8.3.0
 */
function parseIriSet(
  raw: string | undefined,
  toIri: (id: string) => string,
): string | readonly string[] | null {
  if (!raw) return null;

  const ids: string[] = raw
    .split(',')
    .map((id: string): string => id.trim())
    .filter((id: string): boolean => id.length > 0);

  if (ids.length === 0) return null;
  return ids.length === 1 ? toIri(ids[0]) : ids.map(toIri);
}

/** The last path segment of an IRI, null in and null out. */
function lastIriSegment(iri: string | null): string | null {
  return iri === null ? null : (iri.split('/').pop() ?? null);
}

/**
 * Function serializeEnumFilter
 *
 * @description
 * The shared serializer for one of the six `equals`/`isAnyOf` fields: a
 * scalar becomes its own raw value, a non-empty array becomes its members
 * comma-joined (`toRaw` rebuilding each to its URL-facing form — the bare id
 * for an IRI field, the value itself for an enum one), `null` or an empty
 * array becomes `null`, removing the param.
 *
 * @template T - The field's own value type.
 *
 * @param {T | readonly T[] | null} value - The field's current value.
 * @param {(item: T) => string | null} toRaw - Rebuilds one value into its URL-facing raw form.
 *
 * @returns {string | null} The param value, `null` to remove it.
 *
 * @since 8.3.0
 */
function serializeEnumFilter<T>(
  value: T | readonly T[] | null,
  toRaw: (item: T) => string | null,
): string | null {
  if (value === null) return null;

  const raw: readonly (string | null)[] = Array.isArray(value)
    ? value.map(toRaw)
    : [toRaw(value as T)];
  const kept: string[] = raw.filter((item: string | null): item is string => item !== null);

  return kept.length === 0 ? null : kept.join(',');
}

/** A `YYYY-MM-DD` query param parsed to a `Date`, `null` for an absent or unparseable value — a tampered date param is dropped rather than sent to the API. */
function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date: Date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Function parseDueRange
 *
 * @description
 * Rebuilds the filter bar's "Deadline" narrowing from its own
 * `dueAfter`/`dueBefore` query params: both present resolves `between`,
 * either alone resolves the matching one-sided operator, neither resolves
 * unfiltered.
 *
 * @param {string | undefined} after - The raw `dueAfter` param.
 * @param {string | undefined} before - The raw `dueBefore` param.
 *
 * @returns {InterventionDueRangeFilter | null} The narrowing the params express.
 *
 * @since 8.1.0
 */
function parseDueRange(
  after: string | undefined,
  before: string | undefined,
): InterventionDueRangeFilter | null {
  const afterDate: Date | null = parseIsoDate(after);
  const beforeDate: Date | null = parseIsoDate(before);

  if (afterDate && beforeDate) return { operator: 'between', after: afterDate, before: beforeDate };
  if (afterDate) return { operator: 'greaterThan', after: afterDate };
  if (beforeDate) return { operator: 'lessThan', before: beforeDate };
  return null;
}

/**
 * Function parsePlannedStartRange
 *
 * @description
 * Rebuilds the filter bar's "Planned start" narrowing from its own
 * `plannedStartAfter`/`plannedStartBefore` query params — the same shape as
 * {@link parseDueRange}, kept as its own function per field rather than a
 * shared generic parser (`ARCHITECTURE.md` §2.9: two consumers do not yet
 * justify that abstraction).
 *
 * @param {string | undefined} after - The raw `plannedStartAfter` param.
 * @param {string | undefined} before - The raw `plannedStartBefore` param.
 *
 * @returns {InterventionPlannedStartRangeFilter | null} The narrowing the params express.
 *
 * @since 8.2.0
 */
function parsePlannedStartRange(
  after: string | undefined,
  before: string | undefined,
): InterventionPlannedStartRangeFilter | null {
  const afterDate: Date | null = parseIsoDate(after);
  const beforeDate: Date | null = parseIsoDate(before);

  if (afterDate && beforeDate) return { operator: 'between', after: afterDate, before: beforeDate };
  if (afterDate) return { operator: 'greaterThan', after: afterDate };
  if (beforeDate) return { operator: 'lessThan', before: beforeDate };
  return null;
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
    readonly dueAfter?: string;
    readonly dueBefore?: string;
    readonly plannedStartAfter?: string;
    readonly plannedStartBefore?: string;
  },
  organizationId: string,
): InterventionListFilters {
  return {
    status: parseOptionSet(raw.status, INTERVENTION_STATUS_FILTER_OPTIONS),
    type: parseOptionSet(raw.type, INTERVENTION_TYPE_FILTER_OPTIONS),
    priority: parseOptionSet(raw.priority, INTERVENTION_PRIORITY_FILTER_OPTIONS),
    site: parseIriSet(raw.site, (id: string): string => `/api/facilities/${id}`),
    responsible: parseIriSet(
      raw.responsible,
      (id: string): string => `/api/organizations/${organizationId}/members/${id}`,
    ),
    label: parseIriSet(raw.label, (id: string): string => `/api/intervention-labels/${id}`),
    mine: raw.mine === '1',
    dueWindow: parseOption(raw.due, INTERVENTION_DUE_WINDOW_OPTIONS),
    dueRange: parseDueRange(raw.dueAfter, raw.dueBefore),
    plannedStartRange: parsePlannedStartRange(raw.plannedStartAfter, raw.plannedStartBefore),
  };
}

/**
 * Function serializeInterventionListFilters
 *
 * @description
 * Turns the active narrowing into the query params that express it — null
 * removes the param from the URL, so a cleared filter leaves no residue. The
 * reverse of {@link parseInterventionListFilters}. `dueRange`'s bounds
 * serialize to plain `YYYY-MM-DD` dates (`.toISOString().slice(0, 10)`), kept
 * separate from `dueWindow`'s own `due=` preset param.
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
  const range: InterventionDueRangeFilter | null = filters.dueRange;
  const plannedStartRange: InterventionPlannedStartRangeFilter | null = filters.plannedStartRange;

  return {
    status: serializeEnumFilter(filters.status, (status): string => status),
    type: serializeEnumFilter(filters.type, (type): string => type),
    priority: serializeEnumFilter(filters.priority, (priority): string => priority),
    site: serializeEnumFilter(filters.site, lastIriSegment),
    responsible: serializeEnumFilter(filters.responsible, lastIriSegment),
    label: serializeEnumFilter(filters.label, lastIriSegment),
    mine: filters.mine ? '1' : null,
    due: filters.dueWindow,
    dueAfter:
      range && (range.operator === 'greaterThan' || range.operator === 'between')
        ? range.after.toISOString().slice(0, 10)
        : null,
    dueBefore:
      range && (range.operator === 'lessThan' || range.operator === 'between')
        ? range.before.toISOString().slice(0, 10)
        : null,
    plannedStartAfter:
      plannedStartRange &&
      (plannedStartRange.operator === 'greaterThan' || plannedStartRange.operator === 'between')
        ? plannedStartRange.after.toISOString().slice(0, 10)
        : null,
    plannedStartBefore:
      plannedStartRange &&
      (plannedStartRange.operator === 'lessThan' || plannedStartRange.operator === 'between')
        ? plannedStartRange.before.toISOString().slice(0, 10)
        : null,
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
    ([key, value]) =>
      key !== 'mine' &&
      value !== null &&
      value !== false &&
      !(Array.isArray(value) && value.length === 0),
  ).length;
}
