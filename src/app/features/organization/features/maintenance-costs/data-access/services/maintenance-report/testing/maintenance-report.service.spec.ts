import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { maintenanceReportFixture } from '@features/organization/features/maintenance-costs/models/report/testing/maintenance-report.fixture';
import { MaintenanceReportService } from '../maintenance-report.service';

describe('MaintenanceReportService', () => {
  let service: MaintenanceReportService;
  let http: HttpTestingController;
  const endpoint = 'https://api.test/api/organizations/org/maintenance-cost';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaintenanceReportService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(MaintenanceReportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends inclusive dates, target filters and pagination to the dedicated exact aggregate', () => {
    service
      .readReport('org', {
        from: '2025-01-01',
        to: '2025-01-31',
        groupBy: 'equipment',
        page: 2,
        itemsPerPage: 30,
        siteId: 'site',
        customerId: 'customer',
        equipmentId: 'equipment',
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === endpoint + '/reports');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.keys().toSorted()).toEqual([
      'customerId',
      'equipmentId',
      'from',
      'groupBy',
      'itemsPerPage',
      'page',
      'siteId',
      'to',
    ]);
    expect(request.request.params.get('groupBy')).toBe('equipment');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('itemsPerPage')).toBe('30');
    expect(request.request.params.get('from')).toBe('2025-01-01');
    expect(request.request.params.get('to')).toBe('2025-01-31');
    expect(request.request.params.get('equipmentId')).toBe('equipment');
    request.flush(maintenanceReportFixture());
  });
  it('never invents an unfiltered target parameter or reads ordinary resource endpoints', () => {
    service
      .readReport('org', {
        from: '2025-01-01',
        to: '2025-01-31',
        groupBy: 'customer',
        page: 1,
        itemsPerPage: 60,
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === endpoint + '/reports');
    expect(request.request.params.has('equipmentId')).toBe(false);
    expect(request.request.params.has('siteId')).toBe(false);
    expect(request.request.params.has('customerId')).toBe(false);
    request.flush(maintenanceReportFixture({ groupBy: 'customer' }));
  });
  it('loads a server-paginated minimal directory search with explicit optional scopes', () => {
    service
      .listDossiers('org', {
        page: 3,
        itemsPerPage: 30,
        search: 'Entrance repair',
        from: '2025-01-01',
        to: '2025-01-31',
        siteId: 'site',
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === endpoint + '/dossiers');
    expect(request.request.params.get('search')).toBe('Entrance repair');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('siteId')).toBe('site');
    request.flush({ member: [], totalItems: 0 });
  });
  it('propagates oversized-scope rejection instead of returning a truncated total', () => {
    let failure: unknown;
    service
      .readReport('org', {
        from: '2025-01-01',
        to: '2025-01-31',
        groupBy: 'site',
        page: 1,
        itemsPerPage: 30,
      })
      .subscribe({
        error: (error: unknown) => {
          failure = error;
        },
      });
    http
      .expectOne((candidate) => candidate.url === endpoint + '/reports')
      .flush(
        { title: 'Narrow the scope', detail: 'The report covers too many dossiers.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(failure).toMatchObject({ status: 422, detail: 'The report covers too many dossiers.' });
  });
});
