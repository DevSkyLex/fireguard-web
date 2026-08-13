import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { buildInterventionDuplicatePrefill } from '../intervention-duplicate-prefill.utils';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'intervention-1',
    organization: '/api/organizations/org-1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'published',
    allowedTransitions: [],
    site: '/api/facilities/facility-1',
    responsible: '/api/organizations/org-1/members/member-1',
    participants: ['/api/organizations/org-1/members/member-2'],
    labels: [],
    priority: 'high',
    plannedStartAt: '2026-03-02T09:00:00Z',
    dueAt: '2026-03-09T17:00:00Z',
    reviewNote: 'Looked good.',
    revision: 5,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-02-11T14:30:00Z',
    ...overrides,
  }) as InterventionOutput;

describe('buildInterventionDuplicatePrefill', () => {
  it('should carry only what the creation form owns, name suffixed', () => {
    const prefill = buildInterventionDuplicatePrefill(intervention());

    expect(prefill).toEqual({
      name: 'Quarterly extinguisher sweep (copy)',
      type: 'inventory',
      priority: 'high',
      site: '/api/facilities/facility-1',
      responsible: '/api/organizations/org-1/members/member-1',
    });
  });

  it('should fall back to empty strings for an unset site and responsible', () => {
    const prefill = buildInterventionDuplicatePrefill(
      intervention({ site: null, responsible: null }),
    );

    expect(prefill.site).toBe('');
    expect(prefill.responsible).toBe('');
  });

  it('should never carry status, the planned window or the review note', () => {
    const prefill = buildInterventionDuplicatePrefill(intervention());

    expect(prefill).not.toHaveProperty('status');
    expect(prefill).not.toHaveProperty('plannedStartAt');
    expect(prefill).not.toHaveProperty('dueAt');
    expect(prefill).not.toHaveProperty('reviewNote');
  });
});
