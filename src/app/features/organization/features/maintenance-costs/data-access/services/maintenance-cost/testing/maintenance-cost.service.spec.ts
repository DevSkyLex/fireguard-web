import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import { MaintenanceCostService } from '../maintenance-cost.service';

describe('MaintenanceCostService financial contract', () => {
  let service: MaintenanceCostService;
  let http: HttpTestingController;
  const base = 'https://api.test/api/organizations/org';
  const cost = maintenanceCostFixture();
  const costUrl = base + '/interventions/' + cost.interventionId + '/costs';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaintenanceCostService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(MaintenanceCostService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads a dedicated private dossier without using the ordinary intervention endpoint', () => {
    service.readCost('org', cost.interventionId).subscribe();
    const request = http.expectOne(costUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(cost);
  });
  it('sends independent quoted revision zero and exact nullable preparation', () => {
    const input = {
      plannedBudget: '9007199254740993.123456',
      estimatedMinutes: null,
      resources: [],
    };
    service.writePlanning('org', cost.interventionId, input, 0).subscribe();
    const request = http.expectOne(costUrl + '/planning');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-0"');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual(input);
    request.flush(cost);
  });
  it('appends motivated signed corrections with unchanged replay and original identifiers', () => {
    const input = {
      clientId: '12345678-1234-4234-8234-123456789abd',
      amount: '-0.000001',
      description: 'Refund original fee',
      incurredAt: '2025-01-01T12:34:56Z',
      adjustmentOf: 'original',
      workItemId: 'task',
    };
    service.createExpense('org', cost.interventionId, input).subscribe();
    const request = http.expectOne(costUrl + '/expenses');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush(cost);
  });
  it('reads currency and rate history in organization scope with server pagination', () => {
    service.readCurrency('org').subscribe();
    http
      .expectOne(base + '/maintenance-cost/currency')
      .flush({ organizationId: 'org', currency: 'EUR', locked: true });
    service
      .listRates('org', { page: 2, itemsPerPage: 30, params: { memberId: 'member' } })
      .subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === base + '/maintenance-cost/rates',
    );
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('itemsPerPage')).toBe('30');
    expect(request.request.params.get('memberId')).toBe('member');
    request.flush({ member: [], totalItems: 0 });
  });
  it('sends a dated exact rate and propagates an immutable receipt', () => {
    const input = {
      clientId: '12345678-1234-4234-8234-123456789abe',
      memberId: 'member',
      hourlyAmount: '9007199254740993.123456',
      effectiveFrom: '2026-10-06',
    };
    service.createRate('org', input).subscribe();
    const request = http.expectOne(base + '/maintenance-cost/rates');
    expect(request.request.body).toEqual(input);
    request.flush({ id: input.clientId, ...input, currency: 'EUR', replayed: true });
  });
  it('propagates a planning precondition failure to retain and compare the draft', () => {
    let failure: unknown;
    service
      .writePlanning(
        'org',
        cost.interventionId,
        { plannedBudget: null, estimatedMinutes: null, resources: [] },
        2,
      )
      .subscribe({
        error: (error: unknown) => {
          failure = error;
        },
      });
    const request = http.expectOne(costUrl + '/planning');
    expect(request.request.headers.get('If-Match')).toBe('"revision-2"');
    request.flush(
      { title: 'Stale planning', detail: 'Read the latest revision.' },
      { status: 412, statusText: 'Precondition Failed' },
    );
    expect(failure).toMatchObject({ status: 412, detail: 'Read the latest revision.' });
  });
});
