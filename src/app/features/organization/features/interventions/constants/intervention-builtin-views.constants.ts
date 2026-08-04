import type {
  InterventionListFilters,
  InterventionView,
} from '@features/organization/features/interventions/models';

/**
 * Constant CURRENT_MEMBER_SENTINEL
 *
 * @description
 * Placeholder standing in for "whoever is looking" in a view's `responsible`
 * filter. Resolved to the current member's IRI at query time, so a stored view
 * does not hard-code the member who happened to create it — and so the built-in
 * "Mine" means the same thing to everyone.
 *
 * It is a value the API would never return: IRIs start with a slash.
 *
 * @since 1.0.0
 */
export const CURRENT_MEMBER_SENTINEL = '@me';

/**
 * Constant MAX_CUSTOM_VIEWS
 *
 * @description
 * How many views an operator may save. Five is what a cookie carries
 * comfortably, and a view bar past five stops being scannable — which is the
 * whole point of naming a view.
 *
 * @since 1.0.0
 */
export const MAX_CUSTOM_VIEWS = 5;

/**
 * The narrowing a view starts from: nothing filtered.
 */
const NO_FILTERS: InterventionListFilters = {
  status: null,
  type: null,
  site: null,
  responsible: null,
  dueWindow: null,
};

/**
 * Constant INTERVENTION_BUILTIN_VIEWS
 *
 * @description
 * The five questions every organization asks, shipped ready. Each is a real
 * combination of parameters the API already accepts — none of them needs an
 * endpoint that does not exist.
 *
 * "Mine" and "Overdue" section by deadline rather than by status: once the
 * question already fixes the status, stacking by status says nothing.
 *
 * @since 1.0.0
 */
export const INTERVENTION_BUILTIN_VIEWS: readonly InterventionView[] = [
  {
    id: 'all',
    label: $localize`:@@intervention.view.all:All`,
    builtin: true,
    filters: NO_FILTERS,
    sort: { field: 'dueAt', direction: 'asc' },
    grouping: 'status',
    render: 'list',
  },
  {
    id: 'mine',
    label: $localize`:@@intervention.view.mine:Mine`,
    builtin: true,
    filters: { ...NO_FILTERS, responsible: CURRENT_MEMBER_SENTINEL },
    sort: { field: 'dueAt', direction: 'asc' },
    grouping: 'dueWindow',
    render: 'list',
  },
  {
    id: 'overdue',
    label: $localize`:@@intervention.view.overdue:Overdue`,
    builtin: true,
    filters: { ...NO_FILTERS, dueWindow: 'overdue' },
    sort: { field: 'dueAt', direction: 'asc' },
    grouping: 'status',
    render: 'list',
  },
  {
    id: 'review',
    label: $localize`:@@intervention.view.review:To review`,
    builtin: true,
    filters: { ...NO_FILTERS, status: 'submitted' },
    sort: { field: 'dueAt', direction: 'asc' },
    grouping: 'dueWindow',
    render: 'list',
  },
  {
    id: 'drafts',
    label: $localize`:@@intervention.view.drafts:Drafts`,
    builtin: true,
    filters: { ...NO_FILTERS, status: 'draft' },
    sort: { field: 'createdAt', direction: 'desc' },
    grouping: 'dueWindow',
    render: 'list',
  },
];
