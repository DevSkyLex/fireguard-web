import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { AuditEventService } from '@features/organization/data-access';
import type { AuditEventOutput } from '@features/organization/models';
import { AuditStore } from '../audit.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('AuditStore', () => {
  let store: AuditStore;
  let mockAuditEventService: {
    list: ReturnType<typeof vi.fn>;
  };

  const event = { id: 'audit-1', action: 'organization.updated' } as unknown as AuditEventOutput;
  const collection: HydraCollection<AuditEventOutput> = {
    '@id': '/api/audit-events',
    '@type': 'Collection',
    totalItems: 1,
    member: [event],
  };

  beforeEach(() => {
    mockAuditEventService = {
      list: vi.fn().mockReturnValue(of(collection)),
    };

    TestBed.configureTestingModule({
      providers: [
        AuditStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: AuditEventService, useValue: mockAuditEventService },
      ],
    });

    store = TestBed.inject(AuditStore);
  });

  it('should load audit events', async () => {
    store.load();
    await flushEffects();

    expect(mockAuditEventService.list).toHaveBeenCalledWith(undefined);
    expect(store.auditEvents()).toEqual([event]);
    expect(store.totalAuditEvents()).toBe(1);
  });

  it('should clear loaded audit events', async () => {
    store.load();
    await flushEffects();

    store.clear();

    expect(store.auditEvents()).toEqual([]);
    expect(store.totalAuditEvents()).toBe(0);
    expect(store.listCallState().status).toBe('idle');
  });
});
