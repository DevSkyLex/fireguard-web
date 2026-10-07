import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { MaintenancePlanService } from '../maintenance-plan.service';

describe('MaintenancePlanService', () => {
  let service: MaintenancePlanService;
  let httpMock: HttpTestingController;
  const base = 'https://api.test/api/organizations/org-1/maintenance/plans';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaintenancePlanService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(MaintenancePlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => httpMock.verify());

  it('forwards independent operation kind, search and server pagination', () => {
    service
      .list('org-1', {
        page: 2,
        itemsPerPage: 30,
        search: 'Annual',
        params: { operationKind: 'control' },
      })
      .subscribe();
    const request = httpMock.expectOne((candidate) => candidate.url === base);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('operationKind')).toBe('control');
    expect(request.request.params.get('search')).toBe('Annual');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ '@id': base, '@type': 'Collection', member: [], totalItems: 0 });
  });

  it('prepares a plan without setting activation or reusing the offline clientId', () => {
    const input = {
      equipmentId: 'equipment-1',
      name: 'Monthly service',
      operationKind: 'maintenance' as const,
      interval: 'P1M',
      anchorAt: '2026-01-31T00:00:00Z',
    };
    service.create('org-1', input).subscribe();
    const request = httpMock.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    expect(request.request.body.active).toBeUndefined();
    expect(request.request.body.clientId).toBeUndefined();
    request.flush({ '@id': `${base}/plan-1`, '@type': 'MaintenancePlan', id: 'plan-1' });
  });

  it('reads preview from the server without calendar query parameters', () => {
    let dates: readonly string[] = [];
    service.preview('org-1', 'plan-1').subscribe((result) => (dates = result.dates));
    const request = httpMock.expectOne(`${base}/plan-1/preview`);
    expect(request.request.method).toBe('GET');
    request.flush({ dates: ['2026-02-28', '2026-03-31', '2026-04-30'] });
    expect(dates).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('sends only explicit activation in the merge patch', () => {
    service.update('org-1', 'plan-1', { active: true }).subscribe();
    const request = httpMock.expectOne(`${base}/plan-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual({ active: true });
    request.flush({
      '@id': `${base}/plan-1`,
      '@type': 'MaintenancePlan',
      id: 'plan-1',
      active: true,
    });
  });

  it('keeps recovered generation separate from a requested new attempt', () => {
    service.generate('org-1', 'plan-1', false).subscribe();
    const request = httpMock.expectOne(`${base}/plan-1/generate`);
    expect(request.request.body).toEqual({ retry: false });
    request.flush({
      occurrenceId: 'occurrence-1',
      interventionId: 'work-1',
      number: 1,
      workItemsCount: 1,
      replayed: true,
    });
    service.generate('org-1', 'plan-1', true).subscribe();
    const retry = httpMock.expectOne(`${base}/plan-1/generate`);
    expect(retry.request.body).toEqual({ retry: true });
    retry.flush({
      occurrenceId: 'occurrence-1',
      interventionId: 'work-2',
      number: 2,
      workItemsCount: 1,
      replayed: false,
    });
  });

  it('prepares legacy and switches authority through distinct commands', () => {
    service.prepareLegacy('org-1').subscribe();
    const prepared = httpMock.expectOne(`${base}/prepare-legacy`);
    expect(prepared.request.body).toEqual({});
    prepared.flush({ mode: 'legacy', preparedCount: 5 });
    service.activateEngine('org-1').subscribe();
    const activated = httpMock.expectOne(`${base}/activate`);
    expect(activated.request.method).toBe('POST');
    activated.flush({ mode: 'plans', preparedCount: 5 });
  });
});
