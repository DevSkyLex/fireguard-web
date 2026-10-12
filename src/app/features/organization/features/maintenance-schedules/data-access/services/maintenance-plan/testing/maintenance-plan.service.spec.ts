import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry, type Observable } from 'rxjs';
import type { ApiRequestOptions } from '@core/api';
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

  it.each(['generate', 'prepareLegacy', 'activateEngine'] as const)(
    '%s retains its key across retries and cold subscriptions and forwards explicit options',
    (action) => {
      const invoke = (options?: ApiRequestOptions): Observable<unknown> =>
        action === 'generate'
          ? service.generate('org-1', 'plan-1', false, options)
          : service[action]('org-1', options);
      const path =
        action === 'generate'
          ? 'plan-1/generate'
          : action === 'prepareLegacy'
            ? 'prepare-legacy'
            : 'activate';
      const request$ = invoke();
      request$.pipe(retry(1)).subscribe();
      const lost = httpMock.expectOne(`${base}/${path}`);
      const key = lost.request.headers.get('Idempotency-Key');
      expect(key).toMatch(/^[0-9a-f-]{36}$/i);
      expect(lost.request.body).toEqual(action === 'generate' ? { retry: false } : {});
      lost.flush({}, { status: 503, statusText: 'Response unavailable' });
      const retried = httpMock.expectOne(`${base}/${path}`);
      expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
      retried.flush({});
      request$.subscribe();
      const resubscribed = httpMock.expectOne(`${base}/${path}`);
      expect(resubscribed.request.headers.get('Idempotency-Key')).toBe(key);
      resubscribed.flush({});
      invoke().subscribe();
      const newIntent = httpMock.expectOne(`${base}/${path}`);
      expect(newIntent.request.headers.get('Idempotency-Key')).not.toBe(key);
      newIntent.flush({});
      const options = {
        idempotencyKey: 'c3c1e943-227b-4f31-98c7-90e988359b68',
        headers: { 'If-Match': '"revision-3"' },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        invoke(options).subscribe();
        const manual = httpMock.expectOne(`${base}/${path}`);
        expect(manual.request.headers.get('Idempotency-Key')).toBe(options.idempotencyKey);
        expect(manual.request.headers.get('If-Match')).toBe('"revision-3"');
        manual.flush({});
      }
    },
  );

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
    const newAttempt = httpMock.expectOne(`${base}/plan-1/generate`);
    expect(newAttempt.request.body).toEqual({ retry: true });
    newAttempt.flush({
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
