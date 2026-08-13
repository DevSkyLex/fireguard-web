import type {
  InterventionListFilters,
  InterventionListSort,
} from '@features/organization/features/interventions/models';
import {
  buildInterventionListOptions,
  countActiveFilters,
  parseInterventionListFilters,
  resolveDueWindow,
  serializeInterventionListFilters,
} from '../intervention-list-query.utils';

const NOW = new Date('2026-08-04T12:00:00.000Z');

const NO_FILTERS: InterventionListFilters = {
  status: null,
  type: null,
  priority: null,
  site: null,
  responsible: null,
  label: null,
  mine: false,
  dueWindow: null,
};

const DUE_ASC: InterventionListSort = { field: 'dueAt', direction: 'asc' };

describe('resolveDueWindow', () => {
  it('should bound "overdue" from above only, so anything already past due matches', () => {
    expect(resolveDueWindow('overdue', NOW)).toEqual({ dueAtBefore: '2026-08-04T12:00:00.000Z' });
  });

  it('should bound the forward windows on both sides', () => {
    expect(resolveDueWindow('today', NOW)).toEqual({
      dueAtAfter: '2026-08-04T12:00:00.000Z',
      dueAtBefore: '2026-08-05T12:00:00.000Z',
    });
    expect(resolveDueWindow('week', NOW)).toEqual({
      dueAtAfter: '2026-08-04T12:00:00.000Z',
      dueAtBefore: '2026-08-11T12:00:00.000Z',
    });
    expect(resolveDueWindow('month', NOW)).toEqual({
      dueAtAfter: '2026-08-04T12:00:00.000Z',
      dueAtBefore: '2026-09-03T12:00:00.000Z',
    });
  });
});

describe('buildInterventionListOptions', () => {
  it('should send the ordering alone when nothing is filtered', () => {
    expect(buildInterventionListOptions(NO_FILTERS, DUE_ASC, '', NOW)).toEqual({
      order: { dueAt: 'asc' },
    });
  });

  it('should omit an unset filter rather than send it empty', () => {
    const options = buildInterventionListOptions(
      { ...NO_FILTERS, status: 'planned' },
      DUE_ASC,
      '',
      NOW,
    );

    expect(options).toEqual({ order: { dueAt: 'asc' }, status: 'planned' });
    expect('type' in options).toBe(false);
    expect('site' in options).toBe(false);
  });

  it('should carry every set filter, the search term and the ordering together', () => {
    expect(
      buildInterventionListOptions(
        {
          status: 'in_progress',
          type: 'inventory',
          priority: 'urgent',
          site: '/api/facilities/f-1',
          responsible: '/api/organization_members/m-1',
          label: '/api/intervention-labels/l-1',
          mine: false,
          dueWindow: 'overdue',
        },
        { field: 'priority', direction: 'desc' },
        'roof',
        NOW,
      ),
    ).toEqual({
      order: { priority: 'desc' },
      name: 'roof',
      priority: 'urgent',
      status: 'in_progress',
      type: 'inventory',
      site: '/api/facilities/f-1',
      responsible: '/api/organization_members/m-1',
      label: '/api/intervention-labels/l-1',
      dueAtBefore: '2026-08-04T12:00:00.000Z',
    });
  });

  it('should resolve "mine" to the member filter only once the profile is known', () => {
    const mine: InterventionListFilters = { ...NO_FILTERS, mine: true };
    const memberIri = '/api/organizations/org-1/members/m-1';

    expect(buildInterventionListOptions(mine, DUE_ASC, '', NOW, memberIri)).toEqual({
      order: { dueAt: 'asc' },
      member: memberIri,
    });
    expect('member' in buildInterventionListOptions(mine, DUE_ASC, '', NOW, null)).toBe(false);
    expect('member' in buildInterventionListOptions(NO_FILTERS, DUE_ASC, '', NOW, memberIri)).toBe(
      false,
    );
  });

  it('should expand a forward due window into both bounds', () => {
    expect(
      buildInterventionListOptions({ ...NO_FILTERS, dueWindow: 'week' }, DUE_ASC, '', NOW),
    ).toEqual({
      order: { dueAt: 'asc' },
      dueAtAfter: '2026-08-04T12:00:00.000Z',
      dueAtBefore: '2026-08-11T12:00:00.000Z',
    });
  });

  it('should omit an empty search term', () => {
    expect('name' in buildInterventionListOptions(NO_FILTERS, DUE_ASC, '', NOW)).toBe(false);
  });
});

describe('countActiveFilters', () => {
  it('should count nothing when no filter is set', () => {
    expect(countActiveFilters(NO_FILTERS)).toBe(0);
  });

  it('should count each set filter once', () => {
    expect(countActiveFilters({ ...NO_FILTERS, status: 'draft', dueWindow: 'today' })).toBe(2);
  });

  it('should never count the mine toggle, which has its own visible chip', () => {
    expect(countActiveFilters({ ...NO_FILTERS, mine: true })).toBe(0);
    expect(
      countActiveFilters({ ...NO_FILTERS, mine: true, label: '/api/intervention-labels/l-1' }),
    ).toBe(1);
  });
});

describe('parseInterventionListFilters', () => {
  it('should parse every known param, rebuilding the IRI-valued ones', () => {
    expect(
      parseInterventionListFilters(
        {
          status: 'in_progress',
          type: 'inventory',
          priority: 'urgent',
          site: 'f-1',
          responsible: 'm-1',
          label: 'l-1',
          mine: '1',
          due: 'week',
        },
        'org-1',
      ),
    ).toEqual({
      status: 'in_progress',
      type: 'inventory',
      priority: 'urgent',
      site: '/api/facilities/f-1',
      responsible: '/api/organizations/org-1/members/m-1',
      label: '/api/intervention-labels/l-1',
      mine: true,
      dueWindow: 'week',
    });
  });

  it('should ignore unknown enum values rather than send them to the API', () => {
    expect(
      parseInterventionListFilters(
        { status: 'bogus', type: 'nope', priority: 'x', due: 'someday', mine: 'yes' },
        'org-1',
      ),
    ).toEqual(NO_FILTERS);
  });

  it('should parse an empty query to no filters', () => {
    expect(parseInterventionListFilters({}, 'org-1')).toEqual(NO_FILTERS);
  });
});

describe('serializeInterventionListFilters', () => {
  it('should round-trip what parse produced, back to raw ids', () => {
    const filters: InterventionListFilters = {
      status: 'planned',
      type: null,
      priority: 'high',
      site: '/api/facilities/f-1',
      responsible: '/api/organizations/org-1/members/m-1',
      label: '/api/intervention-labels/l-1',
      mine: true,
      dueWindow: 'overdue',
    };

    expect(serializeInterventionListFilters(filters)).toEqual({
      status: 'planned',
      type: null,
      priority: 'high',
      site: 'f-1',
      responsible: 'm-1',
      label: 'l-1',
      mine: '1',
      due: 'overdue',
    });
  });

  it('should null every param when nothing is filtered, removing them from the URL', () => {
    expect(serializeInterventionListFilters(NO_FILTERS)).toEqual({
      status: null,
      type: null,
      priority: null,
      site: null,
      responsible: null,
      label: null,
      mine: null,
      due: null,
    });
  });
});
