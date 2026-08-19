import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Service } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { HydraCollection, HydraItem, RequestOptions } from '../../../models';
import { HydraApiService } from '../hydra-api.service';

/**
 * Class TestResourceService
 * @class TestResourceService
 * @extends {HydraApiService}
 *
 * @description
 * Minimal concrete subclass exposing {@link HydraApiService.getCollection}
 * so the abstract base's `buildParams` serialization can be exercised
 * through `HttpTestingController` without reaching into protected members.
 */
@Service()
class TestResourceService extends HydraApiService {
  public list(options?: RequestOptions): Observable<HydraCollection<HydraItem>> {
    return this.getCollection<HydraItem>('/api/resources', options);
  }
}

describe('HydraApiService', () => {
  let service: HydraApiService;
  let resourceService: TestResourceService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/resources`;
  const mockCollection: HydraCollection<HydraItem> = {
    '@id': '/api/resources',
    '@type': 'Collection',
    member: [],
    totalItems: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HydraApiService,
        TestResourceService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(HydraApiService);
    resourceService = TestBed.inject(TestResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('sort and search params', () => {
    it('should emit the bracketed order[field] pair for a sort option', () => {
      resourceService.list({ sort: { field: 'createdAt', direction: 'desc' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('order[createdAt]')).toBe('desc');
      req.flush(mockCollection);
    });

    it('should emit the search term as-is', () => {
      resourceService.list({ search: 'north wing' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('search')).toBe('north wing');
      req.flush(mockCollection);
    });

    it('should skip an empty or whitespace-only search term', () => {
      resourceService.list({ search: '   ' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('search')).toBe(false);
      req.flush(mockCollection);
    });

    it('should combine sort, search, page and itemsPerPage with a passthrough param', () => {
      resourceService
        .list({
          page: 2,
          itemsPerPage: 25,
          sort: { field: 'name', direction: 'asc' },
          search: 'nord',
          params: { type: 'building' },
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('25');
      expect(req.request.params.get('order[name]')).toBe('asc');
      expect(req.request.params.get('search')).toBe('nord');
      expect(req.request.params.get('type')).toBe('building');
      req.flush(mockCollection);
    });

    it('should leave a hand-built params passthrough unaffected when no sort or search is set', () => {
      resourceService
        .list({ params: { 'order[legacy]': 'asc', search: 'legacy-term' } })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('order[legacy]')).toBe('asc');
      expect(req.request.params.get('search')).toBe('legacy-term');
      req.flush(mockCollection);
    });

    it('should append a readonly array param as repeated key[]= values, the isAnyOf wire shape', () => {
      resourceService.list({ params: { status: ['draft', 'planned'] } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.getAll('status[]')).toEqual(['draft', 'planned']);
      req.flush(mockCollection);
    });

    it('should send the plain key= form for a scalar param, unaffected by array support', () => {
      resourceService.list({ params: { status: 'draft' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('status')).toBe('draft');
      expect(req.request.params.has('status[]')).toBe(false);
      req.flush(mockCollection);
    });

    it('should drop an empty array param entirely rather than send an empty isAnyOf', () => {
      resourceService.list({ params: { status: [] } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('status[]')).toBe(false);
      req.flush(mockCollection);
    });
  });
});
