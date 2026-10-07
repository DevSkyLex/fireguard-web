import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { ParkService } from '../park.service';

describe('ParkService', () => {
  let service: ParkService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ParkService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(ParkService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('forwards exactly the same scope to counts and the paginated anomaly register', () => {
    const params = { family: 'fire', customerId: 'customer', facilityId: 'site' };
    service.anomaliesSummary('org', { params }).subscribe();
    const summary = http.expectOne((request) => request.url.endsWith('/park-anomalies-summary'));
    expect(summary.request.params.get('customerId')).toBe('customer');
    expect(summary.request.params.get('family')).toBe('fire');
    expect(summary.request.params.get('facilityId')).toBe('site');
    summary.flush({ openAnomalies: 1, bySeverity: { low: 1, medium: 0, high: 0, critical: 0 } });
    service.anomalies('org', { params, page: 3, itemsPerPage: 50 }).subscribe();
    const list = http.expectOne((request) => request.url.endsWith('/park-anomalies'));
    expect(list.request.params.get('customerId')).toBe('customer');
    expect(list.request.params.get('family')).toBe('fire');
    expect(list.request.params.get('facilityId')).toBe('site');
    expect(list.request.params.get('page')).toBe('3');
    list.flush({ member: [], totalItems: 1 });
  });
});
