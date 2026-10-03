import type {
  InterventionCalendarFilters,
  InterventionListFilters,
  InterventionListOptions,
} from '@features/organization/features/interventions/models';
import { buildInterventionListOptions } from '@features/organization/features/interventions/utils';

/**
 * Function projectInterventionCalendarCriteria
 *
 * @description
 * Restricts route filters to the Calendar API's published subset using the existing list mapper.
 * The calendar window supplies date bounds; sorting and search do not apply to this view.
 *
 * @access public
 *
 * @param {InterventionListFilters} filters - Complete parsed route criteria.
 * @param {Date} now - Request clock used by the shared list mapper.
 *
 * @returns {InterventionCalendarFilters} Supported scalar or multi-value filters.
 */
export function projectInterventionCalendarCriteria(
  filters: InterventionListFilters,
  now: Date,
): InterventionCalendarFilters {
  const options: InterventionListOptions = buildInterventionListOptions(
    filters,
    { field: 'dueAt', direction: 'asc' },
    '',
    now,
  );

  return {
    status: options.status,
    type: options.type,
    site: options.site,
    responsible: options.responsible,
  };
}
