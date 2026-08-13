import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';
import { filterAndGroupInterventionWorkItems } from '../intervention-work-item-view.utils';

const item = (overrides: Partial<InterventionWorkItemOutput>): InterventionWorkItemOutput => ({
  '@id': `/api/intervention-work-items/${overrides.id ?? 'wi'}`,
  '@type': 'InterventionWorkItem',
  id: 'wi',
  intervention: '/api/interventions/intervention-1',
  action: 'inspection',
  target: null,
  targetSummary: null,
  resultResource: null,
  assignee: null,
  assigneeProfile: null,
  source: 'planned',
  status: 'planned',
  required: true,
  skipReason: null,
  revision: 1,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
  ...overrides,
});

describe('filterAndGroupInterventionWorkItems', () => {
  const items: readonly InterventionWorkItemOutput[] = [
    item({ id: 'wi-1', status: 'planned' }),
    item({ id: 'wi-2', status: 'in_progress' }),
    item({ id: 'wi-3', status: 'completed' }),
    item({ id: 'wi-4', status: 'skipped' }),
  ];

  it('should keep every item for the all filter', () => {
    expect(filterAndGroupInterventionWorkItems(items, 'all', null).map((i) => i.id)).toEqual([
      'wi-1',
      'wi-2',
      'wi-3',
      'wi-4',
    ]);
  });

  it('should match planned and in-progress items to the remaining filter', () => {
    expect(filterAndGroupInterventionWorkItems(items, 'remaining', null).map((i) => i.id)).toEqual([
      'wi-1',
      'wi-2',
    ]);
  });

  it('should match only completed items to the done filter', () => {
    expect(filterAndGroupInterventionWorkItems(items, 'done', null).map((i) => i.id)).toEqual([
      'wi-3',
    ]);
  });

  it('should match only skipped items to the skipped filter', () => {
    expect(filterAndGroupInterventionWorkItems(items, 'skipped', null).map((i) => i.id)).toEqual([
      'wi-4',
    ]);
  });

  it('should keep the original order when no member id is given', () => {
    expect(filterAndGroupInterventionWorkItems(items, 'all', null).map((i) => i.id)).toEqual([
      'wi-1',
      'wi-2',
      'wi-3',
      'wi-4',
    ]);
  });

  it('should move the member’s own items first, stable otherwise', () => {
    const withAssignees: readonly InterventionWorkItemOutput[] = [
      item({ id: 'wi-1', assignee: '/api/organizations/org-1/members/m-2' }),
      item({ id: 'wi-2', assignee: '/api/organizations/org-1/members/m-1' }),
      item({ id: 'wi-3', assignee: null }),
      item({ id: 'wi-4', assignee: '/api/organizations/org-1/members/m-1' }),
    ];

    expect(
      filterAndGroupInterventionWorkItems(
        withAssignees,
        'all',
        '/api/organizations/org-1/members/m-1',
      ).map((i) => i.id),
    ).toEqual(['wi-2', 'wi-4', 'wi-1', 'wi-3']);
  });

  it('should apply the filter before grouping, so unmatched member items stay excluded', () => {
    const withAssignees: readonly InterventionWorkItemOutput[] = [
      item({ id: 'wi-1', status: 'completed', assignee: '/api/organizations/org-1/members/m-1' }),
      item({ id: 'wi-2', status: 'planned', assignee: '/api/organizations/org-1/members/m-1' }),
    ];

    expect(
      filterAndGroupInterventionWorkItems(
        withAssignees,
        'remaining',
        '/api/organizations/org-1/members/m-1',
      ).map((i) => i.id),
    ).toEqual(['wi-2']);
  });

  it('should treat an unassigned member id as never matching', () => {
    expect(
      filterAndGroupInterventionWorkItems(items, 'all', 'no-such-member').map((i) => i.id),
    ).toEqual(['wi-1', 'wi-2', 'wi-3', 'wi-4']);
  });
});
