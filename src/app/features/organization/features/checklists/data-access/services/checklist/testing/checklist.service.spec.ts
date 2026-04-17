import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';
import type {
  ChecklistListOptions,
  ChecklistOutput,
  CreateChecklistInput,
} from '@features/organization/features/checklists/models';
import { ChecklistService } from '../checklist.service';

describe('ChecklistService', () => {
  let service: ChecklistService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const checklistId = 'checklist-uuid-1';
  const checklistsUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/checklists`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChecklistService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ChecklistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockChecklist: ChecklistOutput = {
    '@id': `/api/organizations/${orgId}/checklists/${checklistId}`,
    '@type': 'Checklist',
    id: checklistId,
    organizationId: orgId,
    name: 'Fire Safety Inspection Checklist v1',
    version: '1.0',
    status: 'active',
    items: [
      {
        id: 'item-uuid-1',
        label: 'Check fire extinguishers',
        description: null,
        position: 1,
        required: true,
      },
    ],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': checklistsUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${checklistsUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return checklists collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockChecklist]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(checklistsUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockChecklist]));
    });

    it('should send GET request with pagination options', () => {
      service.list(orgId, { page: 1, itemsPerPage: 30 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === checklistsUrl);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('itemsPerPage')).toBe('30');
      req.flush(mockCollection([]));
    });

    it('should map OpenAPI checklist filters to query params', () => {
      const options: ChecklistListOptions = {
        status: 'archived',
        page: 2,
        itemsPerPage: 12,
      };

      service.list(orgId, options).subscribe();

      const req = httpMock.expectOne((r) => r.url === checklistsUrl);
      expect(req.request.params.get('status')).toBe('archived');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('12');
      req.flush(mockCollection([]));
    });

    it('should handle API error', () => {
      service.list(orgId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(403),
      });

      const req = httpMock.expectOne(checklistsUrl);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return single checklist', () => {
      service.get(orgId, checklistId).subscribe((checklist) => {
        expect(checklist).toEqual(mockChecklist);
        expect(checklist.items.length).toBe(1);
      });

      const req = httpMock.expectOne(`${checklistsUrl}/${checklistId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockChecklist);
    });

    it('should handle not found error', () => {
      service.get(orgId, 'nonexistent').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${checklistsUrl}/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateChecklistInput = {
      name: 'Fire Safety Inspection Checklist v1',
      version: '1.0',
      items: [{ label: 'Check fire extinguishers', required: true, position: 1 }],
    };

    it('should send POST request and return created checklist', () => {
      service.create(orgId, input).subscribe((checklist) => {
        expect(checklist.name).toBe('Fire Safety Inspection Checklist v1');
        expect(checklist.status).toBe('active');
      });

      const req = httpMock.expectOne(checklistsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockChecklist);
    });

    it('should handle validation error', () => {
      service.create(orgId, { ...input, name: '' }).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(422),
      });

      const req = httpMock.expectOne(checklistsUrl);
      req.flush(
        { status: 422, title: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    });
  });

  // ── archive ────────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('should send POST action request to archive checklist', () => {
      const archived: ChecklistOutput = { ...mockChecklist, status: 'archived' };

      service.archive(orgId, checklistId).subscribe((checklist) => {
        expect(checklist.status).toBe('archived');
      });

      const req = httpMock.expectOne(`${checklistsUrl}/${checklistId}/archive`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(archived);
    });

    it('should handle error when archiving already archived checklist', () => {
      service.archive(orgId, checklistId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(409),
      });

      const req = httpMock.expectOne(`${checklistsUrl}/${checklistId}/archive`);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
  });
});
