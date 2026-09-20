import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { WorkloadService } from '../workload.service';
describe('WorkloadService', () => {
  let service: WorkloadService;
  let http: HttpTestingController;
  const url = 'https://api.test/api/organizations/org/workload';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkloadService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(WorkloadService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends organization-local dates, filters and member pagination to the API', () => {
    service
      .read({
        organizationId: 'org',
        from: '2026-09-14',
        to: '2026-09-20',
        member: 'member',
        team: 'team',
        overloaded: true,
        page: 2,
        pageSize: 20,
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-09-14');
    expect(request.request.params.get('to')).toBe('2026-09-20');
    expect(request.request.params.get('member')).toBe('member');
    expect(request.request.params.get('team')).toBe('team');
    expect(request.request.params.get('overloaded')).toBe('true');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush({});
  });
  it('keeps assessment simulations separate from task mutations', () => {
    const input = {
      changes: [
        {
          taskId: 'task',
          memberId: 'member',
          remainingMinutes: 120,
          startsOn: '2026-09-16',
          endsOn: '2026-09-16',
        },
      ],
    };
    service.assess('org', input).subscribe();
    const request = http.expectOne(url + '/assessments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush({});
  });
  it('sends explicit zero capacity and effective dates without inventing defaults', () => {
    const input = { effectiveOn: '2026-10-01', minutes: [0, 60, 0, 90, 0, 0, 0] };
    service.saveWeek('org', null, input).subscribe();
    const request = http.expectOne(url + '/settings');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush({ id: 'week' });
  });
  it('scopes individual exceptions and cancellation precisely', () => {
    service
      .addException('org', 'member', { startsOn: '2026-09-16', endsOn: '2026-09-18', minutes: 0 })
      .subscribe();
    const create = http.expectOne(url + '/members/member/exceptions');
    expect(create.request.method).toBe('POST');
    create.flush({ id: 'exception' });
    service.cancelException('org', 'member', 'exception').subscribe();
    const cancel = http.expectOne(url + '/members/member/exceptions/exception');
    expect(cancel.request.method).toBe('DELETE');
    cancel.flush(null);
  });
});
