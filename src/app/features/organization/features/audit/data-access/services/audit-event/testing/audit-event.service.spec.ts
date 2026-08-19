import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { AuditEventOutput } from '@features/organization/features/audit/models';
import { AuditEventService } from '../audit-event.service';

describe('AuditEventService', () => {
  let service: AuditEventService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const organizationId = 'org-uuid-1';
  const eventsUrl = `${mockEnv.apiUrl}/api/organizations/${organizationId}/audit-events`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuditEventService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(AuditEventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockEvent: AuditEventOutput = {
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

  const mockCollection = (items: AuditEventOutput[]): HydraCollection<AuditEventOutput> => ({
    '@context': '/api/contexts/Collection',
    '@id': eventsUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
  });

  describe('list', () => {
    it('should GET the organization-scoped collection with no filters by default', () => {
      service.list(organizationId).subscribe((response) => {
        expect(response.member).toEqual([mockEvent]);
      });

      const req = httpMock.expectOne((r) => r.url === eventsUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.has('action')).toBe(false);
      expect(req.request.params.has('from')).toBe(false);
      expect(req.request.params.has('to')).toBe(false);
      req.flush(mockCollection([mockEvent]));
    });

    it('should send action, from and to when provided', () => {
      service
        .list(organizationId, undefined, {
          action: 'facility.created',
          from: '2026-01-01T00:00:00Z',
          to: '2026-01-31T23:59:59Z',
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === eventsUrl);
      expect(req.request.params.get('action')).toBe('facility.created');
      expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00Z');
      expect(req.request.params.get('to')).toBe('2026-01-31T23:59:59Z');
      req.flush(mockCollection([]));
    });

    it('should forward pagination options', () => {
      service.list(organizationId, { page: 2, itemsPerPage: 60 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === eventsUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('60');
      req.flush(mockCollection([]));
    });

    it('should propagate a 403 error untouched', () => {
      let captured: unknown;

      service.list(organizationId).subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne((r) => r.url === eventsUrl);
      req.flush(
        { status: 403, title: 'Forbidden', detail: 'Missing organization.audit.read' },
        { status: 403, statusText: 'Forbidden' },
      );

      expect(captured).toBeTruthy();
    });

    it('should propagate a 400 malformed date-range error untouched', () => {
      let captured: unknown;

      service
        .list(organizationId, undefined, { from: 'not-a-date' })
        .subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne((r) => r.url === eventsUrl);
      req.flush({ status: 400, title: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

      expect(captured).toBeTruthy();
    });
  });
});
