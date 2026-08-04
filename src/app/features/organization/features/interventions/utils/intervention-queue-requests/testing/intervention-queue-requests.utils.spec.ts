import { buildInterventionQueueRequests } from '../intervention-queue-requests.utils';

describe('buildInterventionQueueRequests', () => {
  const NOW = '2026-08-04T10:00:00.000Z';

  it('should split overdue across the two workable statuses', () => {
    const requests = buildInterventionQueueRequests('overdue', NOW);

    expect(requests).toEqual([
      { status: 'planned', dueAtBefore: NOW, order: { dueAt: 'asc' } },
      { status: 'in_progress', dueAtBefore: NOW, order: { dueAt: 'asc' } },
    ]);
  });

  it('should answer awaiting review with a single submitted query', () => {
    expect(buildInterventionQueueRequests('awaitingReview', NOW)).toEqual([
      { status: 'submitted', order: { updatedAt: 'desc' } },
    ]);
  });

  it('should answer changes requested with a single query', () => {
    expect(buildInterventionQueueRequests('changesRequested', NOW)).toEqual([
      { status: 'changes_requested', order: { updatedAt: 'desc' } },
    ]);
  });

  it('should scope mine to the responsible member', () => {
    expect(
      buildInterventionQueueRequests('mine', NOW, '/api/organizations/org-1/members/m-1'),
    ).toEqual([{ responsible: '/api/organizations/org-1/members/m-1', order: { dueAt: 'asc' } }]);
  });

  it('should answer nothing rather than everything when mine has no member', () => {
    expect(buildInterventionQueueRequests('mine', NOW)).toEqual([]);
  });
});
