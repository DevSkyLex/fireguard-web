import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { FacilityService } from './facility.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@core/models/facility';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

describe('FacilityService', () => {
  let service: FacilityService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const facilityId = 'facility-uuid-1';
  const facilityBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/facilities`;
  const typesUrl = `${mockEnv.apiUrl}/api/facilities/types`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FacilityService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(FacilityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockFacility: FacilityOutput = {
    '@id': `/api/organizations/${orgId}/facilities/${facilityId}`,
    '@type': 'Facility',
    id: facilityId,
    organizationId: orgId,
    parentFacilityId: null,
    type: 'building',
    name: 'Building A',
    code: 'BLDG-A',
    status: 'active',
    address: '1 Rue de la Paix, 75001 Paris',
    metadata: {},
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockFacilityType: FacilityTypeOutput = {
    '@id': '/api/facilities/types/building',
    '@type': 'FacilityType',
    value: 'building',
    label: 'Building',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': facilityBaseUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${facilityBaseUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── listTypes ──────────────────────────────────────────────────────────────

  describe('listTypes', () => {
    it('should send GET request and return facility types', () => {
      service.listTypes().subscribe((response) => {
        expect(response.member.length).toBe(1);
        expect(response.member[0].value).toBe('building');
      });

      const req = httpMock.expectOne(typesUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockFacilityType]));
    });
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return facilities collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockFacility]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(facilityBaseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockFacility]));
    });

    it('should send GET request with pagination options', () => {
      service.list(orgId, { page: 2, itemsPerPage: 5 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityBaseUrl);
      expect(req.request.params.get('page')).toBe('2');
      req.flush(mockCollection([]));
    });

    it('should handle unauthorized error', () => {
      service.list(orgId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(403),
      });

      const req = httpMock.expectOne(facilityBaseUrl);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return single facility', () => {
      service.get(orgId, facilityId).subscribe((facility) => {
        expect(facility).toEqual(mockFacility);
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockFacility);
    });

    it('should handle not found error', () => {
      service.get(orgId, 'nonexistent').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateFacilityInput = {
      type: 'building',
      name: 'Building A',
      code: 'BLDG-A',
    };

    it('should send POST request and return created facility', () => {
      service.create(orgId, input).subscribe((facility) => {
        expect(facility.name).toBe('Building A');
        expect(facility.type).toBe('building');
      });

      const req = httpMock.expectOne(facilityBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockFacility);
    });

    it('should handle validation error', () => {
      service.create(orgId, { ...input, name: '' }).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(422),
      });

      const req = httpMock.expectOne(facilityBaseUrl);
      req.flush({ status: 422, title: 'Unprocessable Entity' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const input: UpdateFacilityInput = {
      name: 'Building A — Updated',
    };

    it('should send PATCH request and return updated facility', () => {
      const updated: FacilityOutput = { ...mockFacility, name: 'Building A — Updated' };

      service.update(orgId, facilityId, input).subscribe((facility) => {
        expect(facility.name).toBe('Building A — Updated');
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(updated);
    });
  });

  // ── archive ────────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('should send POST action request to archive facility', () => {
      const archived: FacilityOutput = { ...mockFacility, status: 'archived' };

      service.archive(orgId, facilityId).subscribe((facility) => {
        expect(facility.status).toBe('archived');
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/archive`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(archived);
    });
  });

  // ── move ───────────────────────────────────────────────────────────────────

  describe('move', () => {
    const input: MoveFacilityInput = {
      parentFacilityId: 'facility-uuid-parent',
    };

    it('should send POST request to move facility', () => {
      const moved: FacilityOutput = { ...mockFacility, parentFacilityId: 'facility-uuid-parent' };

      service.move(orgId, facilityId, input).subscribe((facility) => {
        expect(facility.parentFacilityId).toBe('facility-uuid-parent');
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/move`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(moved);
    });
  });
});
