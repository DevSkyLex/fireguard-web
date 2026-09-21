import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { AutomationService } from '@features/organization/features/automations/data-access';
import type { AutomationAttemptOutput } from '@features/organization/features/automations/models';
import { AutomationExecutionsStore } from '../automation-executions.store';

const failed: AutomationAttemptOutput = {
  '@id': '/attempts/a1',
  '@type': 'AutomationAttempt',
  id: 'a1',
  runId: 'action',
  organizationId: 'org',
  ruleKey: 'auto_create_intervention_on_critical_nc',
  subjectId: 'nc',
  attemptNumber: 1,
  status: 'failed',
  createdAt: '2026-09-21T10:00:00Z',
  finishedAt: null,
  requestedBy: null,
  interventionId: null,
  errorCode: 'automation_action_failed',
  canRetry: true,
};
const collection = (
  member: readonly AutomationAttemptOutput[],
  totalItems = member.length,
): HydraCollection<AutomationAttemptOutput> => ({
  '@id': '/attempts',
  '@type': 'Collection',
  member,
  totalItems,
});

describe('AutomationExecutionsStore', () => {
  const api = { policy: vi.fn(), list: vi.fn(), retry: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.policy.mockReturnValue(of({ enabled: true, canManage: true }));
    api.list.mockReturnValue(of(collection([failed], 41)));
    TestBed.configureTestingModule({
      providers: [AutomationExecutionsStore, { provide: AutomationService, useValue: api }],
    });
  });
  it('uses the server total instead of the loaded page size', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 2 });
    expect(store.pageCount()).toBe(3);
    expect(api.list).toHaveBeenCalledWith('org', 2);
  });
  it('does not execute a retry without the server capability', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 1 });
    store.retry({ ...failed, canRetry: false });
    expect(api.retry).not.toHaveBeenCalled();
  });
  it('refreshes on a lost response without submitting a second retry', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 1 });
    api.retry.mockReturnValue(throwError(() => new Error('lost response')));
    api.list.mockReturnValue(
      of(
        collection([{ ...failed, id: 'a2', attemptNumber: 2, status: 'pending', canRetry: false }]),
      ),
    );
    store.retry(failed);
    expect(api.retry).toHaveBeenCalledTimes(1);
    expect(store.attemptEntities()[0]?.id).toBe('a2');
    expect(store.retryCallState().error).not.toBeNull();
  });
  it('blocks duplicate clicks while retaining the original action and attempt', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 1 });
    const result = new Subject<AutomationAttemptOutput>();
    api.retry.mockReturnValue(result);
    store.retry(failed);
    store.retry(failed);
    expect(api.retry).toHaveBeenCalledExactlyOnceWith('org', failed);
    expect(store.isRetrying()).toBe(true);
    result.next({ ...failed, id: 'a2', attemptNumber: 2, status: 'pending' });
    result.complete();
    expect(store.isRetrying()).toBe(false);
  });
  it('rejects a late retry response after leaving and returning to the organization', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 1 });
    const result = new Subject<AutomationAttemptOutput>();
    api.retry.mockReturnValue(result);
    store.retry(failed);
    store.load({ organizationId: 'other', page: 1 });
    store.load({ organizationId: 'org', page: 2 });
    const calls = api.list.mock.calls.length;
    result.next(failed);
    expect(api.list.mock.calls).toHaveLength(calls);
    expect(store.page()).toBe(2);
  });
  it('clears private rows when organization context disappears', () => {
    const store = TestBed.inject(AutomationExecutionsStore);
    store.load({ organizationId: 'org', page: 1 });
    store.load({ organizationId: null, page: 1 });
    expect(store.attemptEntities()).toEqual([]);
    expect(store.policy()).toBeNull();
  });
});
