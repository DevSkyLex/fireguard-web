import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InspectionService } from './inspection.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  InspectionOutput,
  CreateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
  InspectionListOptions,
  NonConformityListOptions,
} from '@core/models/inspection';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

describe('InspectionService', () => {
  let service: InspectionService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const inspectionId = 'inspection-uuid-1';
  const inspectionsBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/inspections`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InspectionService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(InspectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockInspection: InspectionOutput = {
    '@id': `/api/organizations/${orgId}/inspections/${inspectionId}`,
    '@type': 'Inspection',
    id: inspectionId,
    organizationId: orgId,
    equipmentId: 'equipment-uuid-1',
    facilityId: 'facility-uuid-1',
    result: 'pass',
    status: 'draft',
    performedAt: '2026-03-01T09:00:00+00:00',
    inspectorType: 'user',
    inspectorName: 'Jean Dupont',
    inspectorUserId: 'user-uuid-1',
    inspectorOrganizationName: null,
    checklistId: 'checklist-uuid-1',
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-03-01T09:00:00+00:00',
    updatedAt: '2026-03-01T09:00:00+00:00',
  };

  const mockNonConformity: NonConformityOutput = {
    '@id': `/api/organizations/${orgId}/inspections/${inspectionId}/non-conformities/nc-uuid-1`,
    '@type': 'NonConformity',
    id: 'nc-uuid-1',
    inspectionId,
    description: 'Pressure gauge out of range',
    severity: 'high',
    status: 'open',
    dueAt: '2026-04-01T00:00:00+00:00',
    resolvedAt: null,
    notes: null,
    createdAt: '2026-03-01T09:00:00+00:00',
    updatedAt: '2026-03-01T09:00:00+00:00',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': inspectionsBaseUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${inspectionsBaseUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return inspections collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockInspection]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(inspectionsBaseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockInspection]));
    });

    it('should send GET request with pagination options', () => {
      service.list(orgId, { page: 2, itemsPerPage: 20 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === inspectionsBaseUrl);
      expect(req.request.params.get('page')).toBe('2');
      req.flush(mockCollection([]));
    });

    it('should map OpenAPI inspection filters to query params', () => {
      const options: InspectionListOptions = {
        equipmentId: 'equipment-uuid-1',
        facilityId: 'facility-uuid-1',
        result: 'fail',
        status: 'submitted',
        page: 3,
        itemsPerPage: 10,
      };

      service.list(orgId, options).subscribe();

      const req = httpMock.expectOne((r) => r.url === inspectionsBaseUrl);
      expect(req.request.params.get('equipmentId')).toBe('equipment-uuid-1');
      expect(req.request.params.get('facilityId')).toBe('facility-uuid-1');
      expect(req.request.params.get('result')).toBe('fail');
      expect(req.request.params.get('status')).toBe('submitted');
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('itemsPerPage')).toBe('10');
      req.flush(mockCollection([]));
    });

    it('should handle forbidden error', () => {
      service.list(orgId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(403),
      });

      const req = httpMock.expectOne(inspectionsBaseUrl);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return single inspection', () => {
      service.get(orgId, inspectionId).subscribe((inspection) => {
        expect(inspection).toEqual(mockInspection);
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockInspection);
    });

    it('should handle not found error', () => {
      service.get(orgId, 'nonexistent').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateInspectionInput = {
      equipmentId: 'equipment-uuid-1',
      result: 'pass',
      performedAt: '2026-03-01T09:00:00+00:00',
      inspectorType: 'user',
      inspectorName: 'Jean Dupont',
      checklistId: 'checklist-uuid-1',
    };

    it('should send POST request and return created inspection', () => {
      service.create(orgId, input).subscribe((inspection) => {
        expect(inspection.status).toBe('draft');
        expect(inspection.equipmentId).toBe('equipment-uuid-1');
      });

      const req = httpMock.expectOne(inspectionsBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockInspection);
    });

    it('should handle validation error', () => {
      service.create(orgId, input).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(422),
      });

      const req = httpMock.expectOne(inspectionsBaseUrl);
      req.flush(
        { status: 422, title: 'Unprocessable Entity', violations: [] },
        { status: 422, statusText: 'Unprocessable Entity' }
      );
    });
  });

  // ── submit ─────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('should send POST action request to submit inspection', () => {
      const submitted: InspectionOutput = { ...mockInspection, status: 'submitted' };

      service.submit(orgId, inspectionId).subscribe((inspection) => {
        expect(inspection.status).toBe('submitted');
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}/submit`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(submitted);
    });

    it('should handle conflict when inspection is already submitted', () => {
      service.submit(orgId, inspectionId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(409),
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}/submit`);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
  });

  // ── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('should send POST action request to close inspection', () => {
      const closed: InspectionOutput = { ...mockInspection, status: 'closed' };

      service.close(orgId, inspectionId).subscribe((inspection) => {
        expect(inspection.status).toBe('closed');
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}/close`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(closed);
    });
  });

  // ── listNonConformities ────────────────────────────────────────────────────

  describe('listNonConformities', () => {
    it('should send GET request and return non-conformities collection', () => {
      service.listNonConformities(orgId, inspectionId).subscribe((response) => {
        expect(response.member).toEqual([mockNonConformity]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}/non-conformities`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockNonConformity]));
    });

    it('should send GET request with pagination options', () => {
      service.listNonConformities(orgId, inspectionId, { page: 2 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${inspectionsBaseUrl}/${inspectionId}/non-conformities`);
      expect(req.request.params.get('page')).toBe('2');
      req.flush(mockCollection([]));
    });

    it('should map OpenAPI non-conformity filters to query params', () => {
      const options: NonConformityListOptions = {
        severity: 'critical',
        status: 'in_progress',
        page: 4,
        itemsPerPage: 15,
      };

      service.listNonConformities(orgId, inspectionId, options).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${inspectionsBaseUrl}/${inspectionId}/non-conformities`);
      expect(req.request.params.get('severity')).toBe('critical');
      expect(req.request.params.get('status')).toBe('in_progress');
      expect(req.request.params.get('page')).toBe('4');
      expect(req.request.params.get('itemsPerPage')).toBe('15');
      req.flush(mockCollection([]));
    });
  });

  // ── addNonConformity ───────────────────────────────────────────────────────

  describe('addNonConformity', () => {
    const input: AddNonConformityInput = {
      description: 'Pressure gauge out of range',
      severity: 'high',
      dueAt: '2026-04-01T00:00:00+00:00',
    };

    it('should send POST request and return created non-conformity', () => {
      service.addNonConformity(orgId, inspectionId, input).subscribe((nc) => {
        expect(nc.description).toBe('Pressure gauge out of range');
        expect(nc.severity).toBe('high');
        expect(nc.status).toBe('open');
      });

      const req = httpMock.expectOne(`${inspectionsBaseUrl}/${inspectionId}/non-conformities`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockNonConformity);
    });
  });

  // ── updateNonConformityStatus ──────────────────────────────────────────────

  describe('updateNonConformityStatus', () => {
    const nonConformityId = 'nc-uuid-1';
    const input: UpdateNonConformityStatusInput = { status: 'done' };

    it('should send PATCH request to update non-conformity status', () => {
      const resolved: NonConformityOutput = {
        ...mockNonConformity,
        status: 'done',
        resolvedAt: '2026-03-15T00:00:00+00:00',
      };

      service.updateNonConformityStatus(orgId, inspectionId, nonConformityId, input).subscribe((nc) => {
        expect(nc.status).toBe('done');
        expect(nc.resolvedAt).not.toBeNull();
      });

      const req = httpMock.expectOne(
        `${inspectionsBaseUrl}/${inspectionId}/non-conformities/${nonConformityId}/status`
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(resolved);
    });

    it('should handle not found error', () => {
      service.updateNonConformityStatus(orgId, inspectionId, 'nonexistent', input).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(
        `${inspectionsBaseUrl}/${inspectionId}/non-conformities/nonexistent/status`
      );
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
