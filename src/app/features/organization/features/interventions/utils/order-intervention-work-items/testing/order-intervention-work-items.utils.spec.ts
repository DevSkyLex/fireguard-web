import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';
import { orderInterventionWorkItems } from '../order-intervention-work-items.utils';

describe('orderInterventionWorkItems', () => {
  const base: InterventionWorkItemOutput = {
    '@id': '/api/intervention-work-items/test',
    '@type': 'InterventionWorkItem',
    id: 'test',
    intervention: '/api/interventions/test',
    action: 'inspection',
    target: null,
    resultResource: null,
    assignee: null,
    assigneeProfile: null,
    source: 'planned',
    status: 'planned',
    required: true,
    skipReason: null,
    evidenceCount: 0,
    revision: 1,
    createdAt: '2026-09-15T12:00:00Z',
    updatedAt: '2026-09-16T12:00:00Z',
  };
  const items: readonly InterventionWorkItemOutput[] = [
    { ...base, id: 'c', updatedAt: '2026-09-15T12:00:00Z', assignee: '/members/me' },
    { ...base, id: 'b' },
    { ...base, id: 'a' },
  ];

  it('uses update date then identifier without mutating the input', () => {
    expect(orderInterventionWorkItems(items).map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    expect(items.map(({ id }) => id)).toEqual(['c', 'b', 'a']);
  });

  it('prioritizes an assignee before the stable date and identifier order', () => {
    expect(orderInterventionWorkItems(items, '/members/me').map(({ id }) => id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
});
