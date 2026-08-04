import type {
  InterventionListFilters,
  InterventionListSort,
} from '@features/organization/features/interventions/models';
import {
  buildInterventionListOptions,
  countActiveFilters,
  resolveDueWindow,
} from '../intervention-list-query.utils';

const NOW = new Date('2026-08-04T12:00:00.000Z');

const NO_FILTERS: InterventionListFilters = {
  status: null,
  type: null,
  site: null,
  responsible: null,
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
          site: '/api/facilities/f-1',
          responsible: '/api/organization_members/m-1',
          dueWindow: 'overdue',
        },
        { field: 'priority', direction: 'desc' },
        'roof',
        NOW,
      ),
    ).toEqual({
      order: { priority: 'desc' },
      name: 'roof',
      status: 'in_progress',
      type: 'inventory',
      site: '/api/facilities/f-1',
      responsible: '/api/organization_members/m-1',
      dueAtBefore: '2026-08-04T12:00:00.000Z',
    });
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
});
