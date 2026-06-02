import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@features/organization/features/facilities/models';
import { FacilityService } from '../facility.service';

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
    hasChildren: false,
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

    it('should request only root facilities when rootsOnly is set', () => {
      service.list(orgId, { rootsOnly: true }).subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityBaseUrl);
      expect(req.request.params.get('rootsOnly')).toBe('true');
      expect(req.request.params.has('parentFacility')).toBe(false);
      expect(req.request.params.has('exists[parentFacility]')).toBe(false);
      req.flush(mockCollection([]));
    });

    it('should forward includeArchived, status, search and order params', () => {
      service
        .list(orgId, {
          rootsOnly: true,
          includeArchived: true,
          status: 'active',
          search: 'tower',
          order: { name: 'asc' },
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityBaseUrl);
      expect(req.request.params.get('rootsOnly')).toBe('true');
      expect(req.request.params.get('includeArchived')).toBe('true');
      expect(req.request.params.get('status')).toBe('active');
      expect(req.request.params.get('search')).toBe('tower');
      expect(req.request.params.get('order[name]')).toBe('asc');
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

  // ── listChildren ─────────────────────────────────────────────────────────────

  describe('listChildren', () => {
    it('should send GET request to the children endpoint with pagination', () => {
      service.listChildren(orgId, facilityId, { page: 1, itemsPerPage: 30 }).subscribe((response) => {
        expect(response.member).toEqual([mockFacility]);
      });

      const childrenUrl = `${facilityBaseUrl}/${facilityId}/children`;
      const req = httpMock.expectOne((r) => r.url === childrenUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('itemsPerPage')).toBe('30');
      expect(req.request.params.has('rootsOnly')).toBe(false);
      req.flush(mockCollection([mockFacility]));
    });
  });

  // ── listDescendants ───────────────────────────────────────────────────────

  describe('listDescendants', () => {
    it('should send GET request to the descendants endpoint with filters', () => {
      service
        .listDescendants(orgId, facilityId, { includeArchived: true, search: 'floor' })
        .subscribe((response) => {
          expect(response.member).toEqual([mockFacility]);
        });

      const descendantsUrl = `${facilityBaseUrl}/${facilityId}/descendants`;
      const req = httpMock.expectOne((r) => r.url === descendantsUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.get('includeArchived')).toBe('true');
      expect(req.request.params.get('search')).toBe('floor');
      req.flush(mockCollection([mockFacility]));
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
      req.flush(
        { status: 422, title: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
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
