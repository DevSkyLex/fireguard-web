import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config';
import type { PlanOutput } from '@features/organization/models';
import { PlanService } from '../plan.service';

describe('PlanService', () => {
  let service: PlanService;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://api.test.com';
  const plansUrl = `${apiUrl}/api/plans`;
  const plan: PlanOutput = {
    '@id': '/api/plans/plan-pro',
    '@type': 'Plan',
    id: 'plan-pro',
    key: 'pro',
    name: 'Pro',
    description: null,
    limits: {},
    quotas: [],
    isActive: true,
    isDefault: false,
    sortOrder: 2,
    createdAt: '2026-09-01T00:00:00+00:00',
    updatedAt: '2026-09-22T00:00:00+00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlanService,
        { provide: ENV_CONFIG, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(PlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads selectable plans without adding a client-side eligibility filter', () => {
    const response: HydraCollection<PlanOutput> = {
      '@id': '/api/plans',
      '@type': 'Collection',
      member: [plan],
      totalItems: 1,
    };
    let result: HydraCollection<PlanOutput> | undefined;

    service.listAvailable().subscribe((value) => (result = value));

    const request = httpMock.expectOne(plansUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('forwards catalog pagination, ordering, search and explicit filters', () => {
    const response: HydraCollection<PlanOutput> = {
      '@id': '/api/plans',
      '@type': 'Collection',
      member: [],
      totalItems: 4,
      view: {
        '@id': '/api/plans?page=2',
        '@type': 'PartialCollectionView',
        previous: '/api/plans?page=1',
      },
    };
    let result: HydraCollection<PlanOutput> | undefined;

    service
      .listAvailable({
        page: 2,
        itemsPerPage: 3,
        sort: { field: 'sortOrder', direction: 'asc' },
        search: 'Pro',
        params: { isActive: true },
        headers: { 'Accept-Language': 'fr' },
      })
      .subscribe((value) => (result = value));

    const request = httpMock.expectOne((candidate) => candidate.url === plansUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('itemsPerPage')).toBe('3');
    expect(request.request.params.get('order[sortOrder]')).toBe('asc');
    expect(request.request.params.get('search')).toBe('Pro');
    expect(request.request.params.get('isActive')).toBe('true');
    expect(request.request.headers.get('Accept-Language')).toBe('fr');
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('reads a plan by its identifier and preserves its published quotas', () => {
    let result: PlanOutput | undefined;

    service.get('plan-pro').subscribe((value) => (result = value));

    const request = httpMock.expectOne(`${plansUrl}/plan-pro`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('Accept')).toBe('application/ld+json');
    request.flush(plan);

    expect(result).toEqual(plan);
  });

  it('propagates an unavailable plan error without substituting a default plan', () => {
    const error = { '@type': 'Error', status: 404, detail: 'Plan not found.' };
    let caught: unknown;

    service.get('missing-plan').subscribe({ error: (value: unknown) => (caught = value) });

    httpMock
      .expectOne(`${plansUrl}/missing-plan`)
      .flush(error, { status: 404, statusText: 'Not Found' });

    expect(caught).toEqual(error);
    httpMock.expectNone(plansUrl);
  });
});
