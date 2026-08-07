import {
  resolveInterventionTag,
  type InterventionDueWindow,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionType,
  type SelectOption,
} from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_STATUS_FILTER_OPTIONS
 *
 * @description
 * Every workflow status, offered one at a time because the API filters `status`
 * as a single value. Labels come from the feature's tag registry rather than a
 * second copy, so adding a status changes one map (ARCHITECTURE.md §10.10).
 *
 * @since 1.0.0
 */
export const INTERVENTION_STATUS_FILTER_OPTIONS: SelectOption<InterventionStatus>[] = (
  [
    'draft',
    'planned',
    'in_progress',
    'submitted',
    'changes_requested',
    'published',
    'abandoned',
  ] satisfies readonly InterventionStatus[]
).map((status) => ({ value: status, label: resolveInterventionTag('status', status).label }));

/**
 * Constant INTERVENTION_TYPE_FILTER_OPTIONS
 *
 * @description
 * The three workflow types, labelled from the same registry as the status set.
 *
 * @since 1.0.0
 */
export const INTERVENTION_TYPE_FILTER_OPTIONS: SelectOption<InterventionType>[] = (
  ['site_setup', 'inventory', 'inspection_campaign'] satisfies readonly InterventionType[]
).map((type) => ({ value: type, label: resolveInterventionTag('type', type).label }));

/**
 * Constant INTERVENTION_DUE_WINDOW_OPTIONS
 *
 * @description
 * Named due-date windows. Each resolves to a pair of ISO bounds at request
 * time, so "this week" means the same thing whichever day it is asked on.
 *
 * @since 1.0.0
 */
export const INTERVENTION_DUE_WINDOW_OPTIONS: SelectOption<InterventionDueWindow>[] = [
  { value: 'overdue', label: $localize`:@@intervention.list.dueOverdue:Already overdue` },
  { value: 'today', label: $localize`:@@intervention.list.dueToday:Due today` },
  { value: 'week', label: $localize`:@@intervention.list.dueWeek:Due within 7 days` },
  { value: 'month', label: $localize`:@@intervention.list.dueMonth:Due within 30 days` },
];

/**
 * Constant INTERVENTION_SORT_OPTIONS
 *
 * @description
 * The orderings the collection supports. The page used to send
 * `order[createdAt]=desc` with no control over it.
 *
 * @since 1.0.0
 */
export const INTERVENTION_SORT_OPTIONS: SelectOption<InterventionSortField>[] = [
  { value: 'dueAt', label: $localize`:@@intervention.list.sortDueAt:Due date` },
  { value: 'createdAt', label: $localize`:@@intervention.list.sortCreatedAt:Creation date` },
  { value: 'priority', label: $localize`:@@intervention.list.sortPriority:Priority` },
];
