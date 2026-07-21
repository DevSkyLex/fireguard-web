import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuditEventService } from '@features/organization/data-access';
import type { AuditEventOutput } from '@features/organization/models';
import { RecentActivityStore } from '../organization-dashboard-recent-activity.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('RecentActivityStore', () => {
  let store: InstanceType<typeof RecentActivityStore>;
  let mockAuditEventService: {
    list: ReturnType<typeof vi.fn>;
  };

  const auditEvent = {
    '@id': '/api/audit-events/evt-1',
    '@type': 'AuditEvent',
    id: 'evt-1',
    action: 'organization.member_added',
    actorType: 'user',
    actorEmail: 'claire.lefevre@example.com',
    occurredAt: '2026-07-20T09:30:00+00:00',
    recordedAt: '2026-07-20T09:30:01+00:00',
    chainId: 'chain-1',
    sequence: 12,
    eventHash: 'hash-1',
  } as unknown as AuditEventOutput;

  beforeEach(() => {
    mockAuditEventService = {
      list: vi.fn().mockReturnValue(of({ member: [auditEvent], totalItems: 1 })),
    };

    TestBed.configureTestingModule({
      providers: [
        RecentActivityStore,
        { provide: AuditEventService, useValue: mockAuditEventService },
      ],
    });

    store = TestBed.inject(RecentActivityStore);
  });

  it('should fetch the newest ledger page when the gate opens', async () => {
    store.load(true);
    await flushEffects();

    expect(mockAuditEventService.list).toHaveBeenCalledWith({ itemsPerPage: 8 });
    expect(store.queryData()).toEqual([auditEvent]);
    expect(store.isQueryLoaded()).toBe(true);
  });

  it('should not fetch while the gate is closed', async () => {
    store.load(false);
    await flushEffects();

    expect(mockAuditEventService.list).not.toHaveBeenCalled();
    expect(store.queryData()).toBeNull();
  });

  it('should normalize a failed query into the error state', async () => {
    mockAuditEventService.list.mockReturnValue(throwError(() => new Error('boom')));

    store.load(true);
    await flushEffects();

    expect(store.queryHasError()).toBe(true);
    expect(store.queryData()).toBeNull();
  });
});
