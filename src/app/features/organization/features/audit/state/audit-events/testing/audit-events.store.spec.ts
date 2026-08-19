import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { AuditEventService } from '@features/organization/features/audit/data-access';
import type { AuditEventOutput } from '@features/organization/features/audit/models';
import { AuditEventsStore } from '../audit-events.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('AuditEventsStore', () => {
  let store: InstanceType<typeof AuditEventsStore>;
  let mockService: { list: ReturnType<typeof vi.fn> };

  const organizationId = 'org-1';

  const event: AuditEventOutput = {
    '@id': `/api/organizations/${organizationId}/audit-events/event-1`,
    '@type': 'OrganizationAuditEvent',
    id: 'event-1',
    action: 'facility.created',
    actorType: 'user',
    actorId: 'member-1',
    actorDisplayName: 'Jane Doe',
    subjectType: 'facility',
    subjectId: 'facility-1',
    metadata: { name: 'HQ' },
    occurredAt: '2026-01-18T10:00:00+00:00',
    recordedAt: '2026-01-18T10:00:00+00:00',
  };

  const collection: HydraCollection<AuditEventOutput> = {
    '@id': `/api/organizations/${organizationId}/audit-events`,
    '@type': 'Collection',
    totalItems: 1,
    member: [event],
  };

  beforeEach(() => {
    mockService = { list: vi.fn().mockReturnValue(of(collection)) };

    TestBed.configureTestingModule({
      providers: [AuditEventsStore, { provide: AuditEventService, useValue: mockService }],
    });

    store = TestBed.inject(AuditEventsStore);
  });

  describe('load', () => {
    it('should populate the event collection and total on success', async () => {
      store.load({ organizationId });
      await flushEffects();

      expect(mockService.list).toHaveBeenCalledWith(organizationId, undefined, undefined);
      expect(store.events()).toEqual([event]);
      expect(store.totalEvents()).toBe(1);
      expect(store.isEmpty()).toBe(false);
      expect(store.hasListError()).toBe(false);
    });

    it('should forward the query and pagination options untouched', async () => {
      store.load({
        organizationId,
        options: { page: 2, itemsPerPage: 60 },
        query: { action: 'facility.created', from: '2026-01-01T00:00:00Z' },
      });
      await flushEffects();

      expect(mockService.list).toHaveBeenCalledWith(
        organizationId,
        { page: 2, itemsPerPage: 60 },
        { action: 'facility.created', from: '2026-01-01T00:00:00Z' },
      );
    });

    it('should report pending while the request is in flight', async () => {
      mockService.list.mockReturnValue(new Subject());
      store.load({ organizationId });
      await flushEffects();

      expect(store.isLoading()).toBe(true);
    });

    it('should record a normalized error on failure', async () => {
      mockService.list.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 500,
          title: 'Server error',
          detail: 'Something went wrong',
        })),
      );

      store.load({ organizationId });
      await flushEffects();

      expect(store.hasListError()).toBe(true);
      expect(store.isForbidden()).toBe(false);
    });

    it('should distinguish a 403 permission denial from a generic failure', async () => {
      mockService.list.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 403,
          title: 'Forbidden',
          detail: 'Missing organization.audit.read',
        })),
      );

      store.load({ organizationId });
      await flushEffects();

      expect(store.hasListError()).toBe(true);
      expect(store.isForbidden()).toBe(true);
    });

    it('should replace the whole collection rather than accumulate rows across pages', async () => {
      store.load({ organizationId });
      await flushEffects();

      const secondPage: AuditEventOutput = { ...event, id: 'event-2' };
      mockService.list.mockReturnValue(of({ ...collection, member: [secondPage], totalItems: 1 }));

      store.load({ organizationId, options: { page: 2 } });
      await flushEffects();

      expect(store.events()).toEqual([secondPage]);
    });
  });
});
