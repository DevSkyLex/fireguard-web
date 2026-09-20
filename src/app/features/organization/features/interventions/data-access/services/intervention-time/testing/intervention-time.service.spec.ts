import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { InterventionTimeService } from '../intervention-time.service';
describe('InterventionTimeService', () => {
  let service: InterventionTimeService;
  let http: HttpTestingController;
  const url = 'https://api.test/api/intervention-work-items/task/time-entries';
  const input = {
    id: 'stable-id',
    memberId: 'member',
    workedOn: '2026-09-16',
    minutes: 120,
    note: null,
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionTimeService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(InterventionTimeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('creates with the exact stable ID and without an operational revision', () => {
    service.createEntry('task', input).subscribe();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual(input);
    expect(request.request.headers.has('If-Match')).toBe(false);
    request.flush({});
  });
  it('corrects against the journal revision only', () => {
    service.correctEntry('task', input, 3).subscribe();
    const request = http.expectOne(url + '/stable-id');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-3"');
    request.flush({});
  });
  it('cancels using the reviewed revision', () => {
    service.cancelEntry('task', 'stable-id', 4).subscribe();
    const request = http.expectOne(url + '/stable-id');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('keeps revision conflicts visible to its caller', () => {
    const failed = vi.fn();
    service.correctEntry('task', input, 1).subscribe({ error: failed });
    http
      .expectOne(url + '/stable-id')
      .flush(
        { '@type': 'Error', status: 412, detail: 'Revision changed' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    expect(failed).toHaveBeenCalledWith(expect.objectContaining({ status: 412 }));
  });
});
