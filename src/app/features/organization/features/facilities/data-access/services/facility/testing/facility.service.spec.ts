import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { HydraCollection, HydraItem, ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  FacilityOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
  DuplicateFacilityInput,
} from '@features/organization/features/facilities/models';
import { FacilityService } from '../facility.service';

describe('FacilityService', () => {
  let service: FacilityService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const facilityId = 'facility-uuid-1';
  const facilityBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/facilities`;

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
    path: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': facilityBaseUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${facilityBaseUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
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

    it('should forward the passthrough params bag the table emits', () => {
      service
        .list(orgId, {
          rootsOnly: true,
          params: { search: 'nord', type: 'building', 'order[name]': 'asc' },
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityBaseUrl);
      expect(req.request.params.get('search')).toBe('nord');
      expect(req.request.params.get('type')).toBe('building');
      expect(req.request.params.get('order[name]')).toBe('asc');
      expect(req.request.params.get('rootsOnly')).toBe('true');
      req.flush(mockCollection([]));
    });

    it('should let a typed filter win over the same key in the params bag', () => {
      service.list(orgId, { status: 'archived', params: { status: 'active' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityBaseUrl);
      expect(req.request.params.get('status')).toBe('archived');
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

    it('should forward includeArchived, status, search and the typed sort option', () => {
      service
        .list(orgId, {
          rootsOnly: true,
          includeArchived: true,
          status: 'active',
          search: 'tower',
          sort: { field: 'name', direction: 'asc' },
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
      service
        .listChildren(orgId, facilityId, { page: 1, itemsPerPage: 30 })
        .subscribe((response) => {
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

  // ── getPlanOverlay ─────────────────────────────────────────────────────────

  describe('getPlanOverlay', () => {
    const overlay = {
      attachmentId: 'plan-1',
      imageWidth: 1200,
      imageHeight: 800,
      zones: [],
      equipment: [],
    };

    it('should send GET request without attachmentId when omitted', () => {
      service.getPlanOverlay(orgId, facilityId).subscribe((response) => {
        expect(response).toEqual(overlay);
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/plan-overlay`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(overlay);
    });

    it('should forward attachmentId as a query param', () => {
      service.getPlanOverlay(orgId, facilityId, 'plan-1').subscribe();

      const req = httpMock.expectOne(
        `${facilityBaseUrl}/${facilityId}/plan-overlay?attachmentId=plan-1`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(overlay);
    });

    it('should handle a not found error', () => {
      service.getPlanOverlay(orgId, facilityId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/plan-overlay`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── setPlanGeometry ────────────────────────────────────────────────────────

  describe('setPlanGeometry', () => {
    it('should send PUT request with the geometry body', () => {
      service
        .setPlanGeometry(orgId, facilityId, {
          attachmentId: 'plan-1',
          points: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        })
        .subscribe();

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/plan-geometry`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual({
        attachmentId: 'plan-1',
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      });
      req.flush(null);
    });

    it('should send null attachmentId and points to clear the geometry', () => {
      service.setPlanGeometry(orgId, facilityId, { attachmentId: null, points: null }).subscribe();

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/plan-geometry`);
      expect(req.request.body).toEqual({ attachmentId: null, points: null });
      req.flush(null);
    });

    it('should propagate a conflict error', () => {
      service
        .setPlanGeometry(orgId, facilityId, { attachmentId: 'plan-1', points: null })
        .subscribe({
          error: (error: ApiError) => expect(error.status).toBe(409),
        });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/plan-geometry`);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
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

  // ── restore ────────────────────────────────────────────────────────────────

  describe('restore', () => {
    it('should send PATCH action request to restore facility', () => {
      const restored: FacilityOutput = { ...mockFacility, status: 'active' };

      service.restore(orgId, facilityId).subscribe((facility) => {
        expect(facility.status).toBe('active');
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/restore`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(restored);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should resolve the canonical revision then send a DELETE with If-Match', () => {
      service.remove(facilityId).subscribe();

      const canonicalReq = httpMock.expectOne(`${mockEnv.apiUrl}/api/facilities/${facilityId}`);
      expect(canonicalReq.request.method).toBe('GET');
      canonicalReq.flush({ ...mockFacility, revision: 3 });

      const deleteReq = httpMock.expectOne(`${mockEnv.apiUrl}/api/facilities/${facilityId}`);
      expect(deleteReq.request.method).toBe('DELETE');
      expect(deleteReq.request.headers.get('If-Match')).toBe('"revision-3"');
      expect(deleteReq.request.withCredentials).toBe(true);
      deleteReq.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should surface a 409 conflict when the facility still has children', () => {
      service.remove(facilityId).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(409);
          expect(error.detail).toContain('child facilities');
        },
      });

      const canonicalReq = httpMock.expectOne(`${mockEnv.apiUrl}/api/facilities/${facilityId}`);
      canonicalReq.flush({ ...mockFacility, revision: 1 });

      const deleteReq = httpMock.expectOne(`${mockEnv.apiUrl}/api/facilities/${facilityId}`);
      deleteReq.flush(
        {
          '@id': '',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'Conflict',
          detail:
            'Cannot delete a facility that still has child facilities; move or remove them first.',
        },
        { status: 409, statusText: 'Conflict' },
      );
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

  // ── duplicate ────────────────────────────────────────────────────────────

  describe('duplicate', () => {
    it('should send POST request with an empty body when no input is given', () => {
      const duplicated: FacilityOutput = { ...mockFacility, id: 'facility-uuid-copy' };

      service.duplicate(orgId, facilityId).subscribe((facility) => {
        expect(facility.id).toBe('facility-uuid-copy');
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/duplicate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBe(true);
      req.flush(duplicated);
    });

    it('should send POST request with the given name and parent', () => {
      const input: DuplicateFacilityInput = {
        name: 'Building A (copy)',
        parentFacilityId: 'facility-uuid-parent',
      };
      const duplicated: FacilityOutput = { ...mockFacility, id: 'facility-uuid-copy' };

      service.duplicate(orgId, facilityId, input).subscribe();

      const req = httpMock.expectOne(`${facilityBaseUrl}/${facilityId}/duplicate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(duplicated);
    });
  });

  describe('exportCsv', () => {
    it('reads the CSV export as a blob without params when no option is given', () => {
      const content = new Blob(['csv-bytes'], { type: 'text/csv' });
      let result: Blob | undefined;

      service.exportCsv(orgId).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(`${facilityBaseUrl}/export`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.withCredentials).toBe(true);
      req.flush(content);

      expect(result).toEqual(content);
    });

    it('forwards the accepted narrowing as query params', () => {
      service
        .exportCsv(orgId, {
          includeArchived: true,
          search: 'north',
          status: 'active',
          rootsOnly: true,
          hasCoordinates: false,
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${facilityBaseUrl}/export` &&
          r.params.get('includeArchived') === 'true' &&
          r.params.get('search') === 'north' &&
          r.params.get('status') === 'active' &&
          r.params.get('rootsOnly') === 'true' &&
          r.params.get('hasCoordinates') === 'false',
      );
      expect(req.request.method).toBe('GET');
      req.flush(new Blob(['csv-bytes'], { type: 'text/csv' }));
    });
  });
});
