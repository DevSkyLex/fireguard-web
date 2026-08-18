import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ApprovalActionTypeOutput,
  ApprovalRequestOutput,
} from '@features/organization/features/approvals/models';
import { ApprovalRequestService } from '../approval-request.service';

describe('ApprovalRequestService', () => {
  let service: ApprovalRequestService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const organizationId = 'org-uuid-1';
  const requestId = 'request-uuid-1';
  const requestsUrl = `${mockEnv.apiUrl}/api/organizations/${organizationId}/approval-requests`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApprovalRequestService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ApprovalRequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockRequest: ApprovalRequestOutput = {
    '@id': `/api/organizations/${organizationId}/approval-requests/${requestId}`,
    '@type': 'ApprovalRequest',
    id: requestId,
    organizationId,
    actionType: 'equipment_decommission',
    subjectId: 'equipment-uuid-1',
    status: 'pending',
    requestedByMemberId: 'member-uuid-1',
    requestedByUserId: 'user-uuid-1',
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
  };

  const mockCollection = (
    items: ApprovalRequestOutput[],
  ): HydraCollection<ApprovalRequestOutput> => ({
    '@context': '/api/contexts/Collection',
    '@id': requestsUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
  });

  describe('list', () => {
    it('should GET the organization-scoped collection with no filters by default', () => {
      service.list(organizationId).subscribe((response) => {
        expect(response.member).toEqual([mockRequest]);
      });

      const req = httpMock.expectOne((r) => r.url === requestsUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('actionType')).toBe(false);
      req.flush(mockCollection([mockRequest]));
    });

    it('should send status and actionType when provided', () => {
      service
        .list(organizationId, undefined, { status: 'pending', actionType: 'nc_waiver' })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === requestsUrl);
      expect(req.request.params.get('status')).toBe('pending');
      expect(req.request.params.get('actionType')).toBe('nc_waiver');
      req.flush(mockCollection([]));
    });

    it('should propagate a request error untouched', () => {
      let captured: unknown;

      service.list(organizationId).subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne((r) => r.url === requestsUrl);
      req.flush({ status: 400, title: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

      expect(captured).toBeTruthy();
    });
  });

  describe('get', () => {
    it('should GET a single request', () => {
      service.get(organizationId, requestId).subscribe((response) => {
        expect(response).toEqual(mockRequest);
      });

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRequest);
    });
  });

  describe('approve', () => {
    it('should POST the optional decision note and return the recomputed request', () => {
      const approved: ApprovalRequestOutput = {
        ...mockRequest,
        status: 'approved',
        decisionNote: 'Looks good',
      };

      service
        .approve(organizationId, requestId, { decisionNote: 'Looks good' })
        .subscribe((response) => expect(response).toEqual(approved));

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ decisionNote: 'Looks good' });
      req.flush(approved);
    });

    it('should send an empty body when no note is given', () => {
      service.approve(organizationId, requestId).subscribe();

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}/approve`);
      expect(req.request.body).toEqual({});
      req.flush(mockRequest);
    });

    it('should propagate a 409 deferred-action-no-longer-applicable error untouched', () => {
      let captured: unknown;

      service
        .approve(organizationId, requestId)
        .subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}/approve`);
      req.flush(
        { status: 409, title: 'Conflict', detail: 'The deferred action is no longer applicable.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(captured).toBeTruthy();
    });

    it('should propagate a 403 self-approval error untouched', () => {
      let captured: unknown;

      service
        .approve(organizationId, requestId)
        .subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}/approve`);
      req.flush(
        { status: 403, title: 'Forbidden', detail: 'Self-approval is not allowed.' },
        { status: 403, statusText: 'Forbidden' },
      );

      expect(captured).toBeTruthy();
    });
  });

  describe('reject', () => {
    it('should POST the optional decision note', () => {
      service.reject(organizationId, requestId, { decisionNote: 'Missing evidence' }).subscribe();

      const req = httpMock.expectOne(`${requestsUrl}/${requestId}/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ decisionNote: 'Missing evidence' });
      req.flush({ ...mockRequest, status: 'rejected' });
    });
  });

  describe('listActionTypes', () => {
    it('should GET the canonical action-type catalog', () => {
      const actionType: ApprovalActionTypeOutput = {
        '@id': '/api/approvals/action-types/nc_waiver',
        '@type': 'ApprovalActionType',
        value: 'nc_waiver',
        label: 'Non-conformity waiver',
      };

      service.listActionTypes().subscribe((response) => {
        expect(response.member).toEqual([actionType]);
      });

      const req = httpMock.expectOne(`${mockEnv.apiUrl}/api/approvals/action-types`);
      expect(req.request.method).toBe('GET');
      req.flush({
        '@context': '/api/contexts/Collection',
        '@id': '/api/approvals/action-types',
        '@type': 'Collection',
        member: [actionType],
        totalItems: 1,
      });
    });
  });
});
