import type { InterventionListFilters } from '@features/organization/features/interventions/models';
import { projectInterventionCalendarCriteria } from '../intervention-calendar-criteria.utils';

/**
 * Constant FILTERS
 *
 * @description
 * Representative complete URL criteria, including fields that the Calendar cannot honour.
 *
 * @access private
 *
 * @type {InterventionListFilters}
 * @constant FILTERS
 */
const FILTERS: InterventionListFilters = Object.freeze<InterventionListFilters>({
  status: 'planned',
  type: 'inventory',
  priority: 'urgent',
  site: '/api/facilities/site-1',
  responsible: '/api/organizations/org-1/members/member-1',
  label: '/api/intervention_labels/label-1',
  mine: true,
  dueWindow: 'overdue',
  dueRange: { operator: 'greaterThan', after: new Date('2026-10-02T00:00:00Z') },
  plannedStartRange: { operator: 'lessThan', before: new Date('2026-11-01T00:00:00Z') },
});

describe('projectInterventionCalendarCriteria', () => {
  it('projects exactly the four API filters without mutating or clearing route criteria', () => {
    expect(projectInterventionCalendarCriteria(FILTERS, new Date('2026-10-03T00:00:00Z'))).toEqual({
      status: 'planned',
      type: 'inventory',
      site: FILTERS.site,
      responsible: FILTERS.responsible,
    });
    expect(FILTERS.status).toBe('planned');
    expect(FILTERS.priority).toBe('urgent');
    expect(FILTERS.mine).toBe(true);
  });

  it('retains multi-value status, type and directory filters without folding them to a scalar', () => {
    const filters: InterventionListFilters = {
      ...FILTERS,
      status: ['planned', 'submitted'],
      type: ['inventory', 'inspection_campaign'],
      site: ['/api/facilities/site-1', '/api/facilities/site-2'],
      responsible: ['/api/organizations/org-1/members/member-1'],
    };
    expect(projectInterventionCalendarCriteria(filters, new Date('2026-10-03T00:00:00Z'))).toEqual({
      status: filters.status,
      type: filters.type,
      site: filters.site,
      responsible: filters.responsible,
    });
  });

  it('leaves cleared or empty filters undefined instead of sending an empty API narrowing', () => {
    expect(
      projectInterventionCalendarCriteria(
        { ...FILTERS, status: null, type: [], site: null, responsible: [] },
        new Date(),
      ),
    ).toEqual({
      status: undefined,
      type: undefined,
      site: undefined,
      responsible: undefined,
    });
  });
});
