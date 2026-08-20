import type {
  InterventionListFilters,
  InterventionListSort,
} from '@features/organization/features/interventions/models';
import {
  buildInterventionExportOptions,
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
  dueRange: null,
  plannedStartRange: null,
};

const DUE_ASC: InterventionListSort = { field: 'dueAt', direction: 'asc' };

describe('resolveDueWindow', () => {
  it('should resolve "overdue" to the server-side preset, which pairs the past-due check with the status exclusion', () => {
    expect(resolveDueWindow('overdue', NOW)).toEqual({ due: 'overdue' });
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

  it('should forward a readonly array narrowing as-is, for HydraApiService.buildParams to repeat', () => {
    const options = buildInterventionListOptions(
      { ...NO_FILTERS, status: ['draft', 'planned'] },
      DUE_ASC,
      '',
      NOW,
    );

    expect(options).toEqual({ order: { dueAt: 'asc' }, status: ['draft', 'planned'] });
  });

  it('should omit an emptied-back-to-unfiltered array rather than send an empty isAnyOf', () => {
    const options = buildInterventionListOptions({ ...NO_FILTERS, status: [] }, DUE_ASC, '', NOW);

    expect('status' in options).toBe(false);
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
          dueRange: null,
          plannedStartRange: null,
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
      due: 'overdue',
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

  it('should resolve a greaterThan dueRange to dueAtAfter alone', () => {
    expect(
      buildInterventionListOptions(
        { ...NO_FILTERS, dueRange: { operator: 'greaterThan', after: new Date('2026-08-10') } },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({ order: { dueAt: 'asc' }, dueAtAfter: '2026-08-10T00:00:00.000Z' });
  });

  it('should resolve a lessThan dueRange to dueAtBefore alone', () => {
    expect(
      buildInterventionListOptions(
        { ...NO_FILTERS, dueRange: { operator: 'lessThan', before: new Date('2026-08-20') } },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({ order: { dueAt: 'asc' }, dueAtBefore: '2026-08-20T00:00:00.000Z' });
  });

  it('should resolve a between dueRange to both bounds', () => {
    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          dueRange: {
            operator: 'between',
            after: new Date('2026-08-10'),
            before: new Date('2026-08-20'),
          },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({
      order: { dueAt: 'asc' },
      dueAtAfter: '2026-08-10T00:00:00.000Z',
      dueAtBefore: '2026-08-20T00:00:00.000Z',
    });
  });

  it('should send the overdue preset alongside a dueRange bound and let the server compose them', () => {
    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          dueWindow: 'overdue',
          dueRange: { operator: 'lessThan', before: new Date('2026-08-01') },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({
      order: { dueAt: 'asc' },
      due: 'overdue',
      dueAtBefore: '2026-08-01T00:00:00.000Z',
    });
  });

  it('should tighten rather than overwrite when a forward dueWindow and the dueRange are both active', () => {
    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          dueWindow: 'week',
          dueRange: { operator: 'lessThan', before: new Date('2026-08-08') },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({
      order: { dueAt: 'asc' },
      dueAtAfter: '2026-08-04T12:00:00.000Z',
      dueAtBefore: '2026-08-08T00:00:00.000Z',
    });
  });

  it('should resolve each plannedStartRange operator to the matching plannedStartAt bound(s), with no legacy preset to tighten against', () => {
    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          plannedStartRange: { operator: 'greaterThan', after: new Date('2026-08-10') },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({ order: { dueAt: 'asc' }, plannedStartAtAfter: '2026-08-10T00:00:00.000Z' });

    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          plannedStartRange: { operator: 'lessThan', before: new Date('2026-08-20') },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({ order: { dueAt: 'asc' }, plannedStartAtBefore: '2026-08-20T00:00:00.000Z' });

    expect(
      buildInterventionListOptions(
        {
          ...NO_FILTERS,
          plannedStartRange: {
            operator: 'between',
            after: new Date('2026-08-10'),
            before: new Date('2026-08-20'),
          },
        },
        DUE_ASC,
        '',
        NOW,
      ),
    ).toEqual({
      order: { dueAt: 'asc' },
      plannedStartAtAfter: '2026-08-10T00:00:00.000Z',
      plannedStartAtBefore: '2026-08-20T00:00:00.000Z',
    });
  });
});

describe('buildInterventionExportOptions', () => {
  it('should send the ordering-free options with no drops when nothing is filtered', () => {
    expect(buildInterventionExportOptions(NO_FILTERS, DUE_ASC, '', NOW)).toEqual({
      options: {},
      droppedFilterCount: 0,
    });
  });

  it('should forward every exportable filter untouched', () => {
    expect(
      buildInterventionExportOptions(
        { ...NO_FILTERS, status: 'planned', type: ['inspection_campaign', 'inventory'] },
        DUE_ASC,
        'sweep',
        NOW,
      ),
    ).toEqual({
      options: {
        name: 'sweep',
        status: 'planned',
        type: ['inspection_campaign', 'inventory'],
      },
      droppedFilterCount: 0,
    });
  });

  it('should drop the "mine" and label narrowing, and count each one dropped', () => {
    const { options, droppedFilterCount } = buildInterventionExportOptions(
      { ...NO_FILTERS, mine: true, label: '/api/intervention-labels/l-1' },
      DUE_ASC,
      '',
      NOW,
      'member-1',
    );

    expect(options).not.toHaveProperty('member');
    expect(options).not.toHaveProperty('label');
    expect(droppedFilterCount).toBe(2);
  });

  it('should drop a planned-start bound the export endpoint rejects', () => {
    const { options, droppedFilterCount } = buildInterventionExportOptions(
      {
        ...NO_FILTERS,
        plannedStartRange: { operator: 'greaterThan', after: new Date('2026-08-10') },
      },
      DUE_ASC,
      '',
      NOW,
    );

    expect(options).not.toHaveProperty('plannedStartAtAfter');
    expect(droppedFilterCount).toBe(1);
  });

  it('should keep the due-date bounds and the overdue preset, both exportable', () => {
    const { options, droppedFilterCount } = buildInterventionExportOptions(
      { ...NO_FILTERS, dueWindow: 'overdue' },
      DUE_ASC,
      '',
      NOW,
    );

    expect(options).toEqual({ due: 'overdue' });
    expect(droppedFilterCount).toBe(0);
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
      dueRange: null,
      plannedStartRange: null,
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

  it('should parse comma-separated enum and IRI params into a readonly array (isAnyOf)', () => {
    expect(
      parseInterventionListFilters(
        {
          status: 'draft,planned',
          type: 'inventory,inspection_campaign',
          priority: 'high,urgent',
          site: 'f-1,f-2',
          responsible: 'm-1,m-2',
          label: 'l-1,l-2',
        },
        'org-1',
      ),
    ).toEqual({
      ...NO_FILTERS,
      status: ['draft', 'planned'],
      type: ['inventory', 'inspection_campaign'],
      priority: ['high', 'urgent'],
      site: ['/api/facilities/f-1', '/api/facilities/f-2'],
      responsible: ['/api/organizations/org-1/members/m-1', '/api/organizations/org-1/members/m-2'],
      label: ['/api/intervention-labels/l-1', '/api/intervention-labels/l-2'],
    });
  });

  it('should drop an unknown value out of a comma-separated enum set rather than send it to the API', () => {
    expect(parseInterventionListFilters({ status: 'draft,bogus' }, 'org-1').status).toBe('draft');
  });

  it('should keep the legacy single-value scalar shape for a bookmarked ?status= link', () => {
    expect(parseInterventionListFilters({ status: 'draft' }, 'org-1').status).toBe('draft');
    expect(parseInterventionListFilters({ site: 'f-1' }, 'org-1').site).toBe('/api/facilities/f-1');
  });

  it('should resolve dueAfter/dueBefore into the matching dueRange operator', () => {
    expect(parseInterventionListFilters({ dueAfter: '2026-08-10' }, 'org-1').dueRange).toEqual({
      operator: 'greaterThan',
      after: new Date('2026-08-10'),
    });
    expect(parseInterventionListFilters({ dueBefore: '2026-08-20' }, 'org-1').dueRange).toEqual({
      operator: 'lessThan',
      before: new Date('2026-08-20'),
    });
    expect(
      parseInterventionListFilters({ dueAfter: '2026-08-10', dueBefore: '2026-08-20' }, 'org-1')
        .dueRange,
    ).toEqual({
      operator: 'between',
      after: new Date('2026-08-10'),
      before: new Date('2026-08-20'),
    });
  });

  it('should drop an unparseable dueAfter/dueBefore rather than send a bad date to the API', () => {
    expect(parseInterventionListFilters({ dueAfter: 'not-a-date' }, 'org-1').dueRange).toBeNull();
  });

  it('should resolve plannedStartAfter/plannedStartBefore into the matching plannedStartRange operator', () => {
    expect(
      parseInterventionListFilters({ plannedStartAfter: '2026-08-10' }, 'org-1').plannedStartRange,
    ).toEqual({ operator: 'greaterThan', after: new Date('2026-08-10') });
    expect(
      parseInterventionListFilters({ plannedStartBefore: '2026-08-20' }, 'org-1').plannedStartRange,
    ).toEqual({ operator: 'lessThan', before: new Date('2026-08-20') });
    expect(
      parseInterventionListFilters(
        { plannedStartAfter: '2026-08-10', plannedStartBefore: '2026-08-20' },
        'org-1',
      ).plannedStartRange,
    ).toEqual({
      operator: 'between',
      after: new Date('2026-08-10'),
      before: new Date('2026-08-20'),
    });
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
      dueRange: null,
      plannedStartRange: null,
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
      dueAfter: null,
      dueBefore: null,
      plannedStartAfter: null,
      plannedStartBefore: null,
    });
  });

  it('should comma-join a readonly array narrowing (isAnyOf), enum and IRI alike', () => {
    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        status: ['draft', 'planned'],
        site: ['/api/facilities/f-1', '/api/facilities/f-2'],
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'draft,planned',
        site: 'f-1,f-2',
      }),
    );
  });

  it('should null an emptied-back-to-unfiltered array the same way it nulls a cleared scalar', () => {
    expect(serializeInterventionListFilters({ ...NO_FILTERS, status: [] })['status']).toBeNull();
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
      dueAfter: null,
      dueBefore: null,
      plannedStartAfter: null,
      plannedStartBefore: null,
    });
  });

  it('should round-trip each dueRange operator to its own dueAfter/dueBefore params', () => {
    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        dueRange: { operator: 'greaterThan', after: new Date('2026-08-10') },
      }),
    ).toEqual(expect.objectContaining({ dueAfter: '2026-08-10', dueBefore: null }));

    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        dueRange: { operator: 'lessThan', before: new Date('2026-08-20') },
      }),
    ).toEqual(expect.objectContaining({ dueAfter: null, dueBefore: '2026-08-20' }));

    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        dueRange: {
          operator: 'between',
          after: new Date('2026-08-10'),
          before: new Date('2026-08-20'),
        },
      }),
    ).toEqual(expect.objectContaining({ dueAfter: '2026-08-10', dueBefore: '2026-08-20' }));
  });

  it('should round-trip each plannedStartRange operator to its own plannedStartAfter/plannedStartBefore params', () => {
    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        plannedStartRange: { operator: 'greaterThan', after: new Date('2026-08-10') },
      }),
    ).toEqual(
      expect.objectContaining({ plannedStartAfter: '2026-08-10', plannedStartBefore: null }),
    );

    expect(
      serializeInterventionListFilters({
        ...NO_FILTERS,
        plannedStartRange: { operator: 'lessThan', before: new Date('2026-08-20') },
      }),
    ).toEqual(
      expect.objectContaining({ plannedStartAfter: null, plannedStartBefore: '2026-08-20' }),
    );
  });
});
