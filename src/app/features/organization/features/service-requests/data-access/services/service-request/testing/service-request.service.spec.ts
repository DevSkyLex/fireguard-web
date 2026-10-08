import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { ServiceRequestService } from '../service-request.service';
describe('ServiceRequestService', () => {
  let service: ServiceRequestService, http: HttpTestingController;
  const url = 'https://api.test/api/organizations/org/service-requests';
  const request = serviceRequestFixture({ revision: 7 });
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ServiceRequestService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(ServiceRequestService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('keeps server pagination and equipment/site/status search predicates together', () => {
    service
      .list('org', {
        page: 2,
        itemsPerPage: 30,
        search: 'gauge',
        params: { status: 'qualified', equipmentId: 'equipment', siteId: 'site' },
      })
      .subscribe();
    const call = http.expectOne((candidate) => candidate.url === url);
    expect(call.request.params.keys()).toEqual(
      expect.arrayContaining(['page', 'itemsPerPage', 'search', 'status', 'equipmentId', 'siteId']),
    );
    expect(call.request.params.get('page')).toBe('2');
    expect(call.request.params.get('status')).toBe('qualified');
    expect(call.request.params.get('equipmentId')).toBe('equipment');
    expect(call.request.params.get('siteId')).toBe('site');
    call.flush({ member: [request], totalItems: 41 });
  });
  it('creates a described site-only request and keeps source IDs separate from offline client identities', () => {
    const input = {
      siteId: 'site',
      equipmentId: null,
      title: 'Gauge damaged',
      description: 'Assess the extinguisher gauge',
      originInspectionId: 'inspection',
      originNonConformityId: 'anomaly',
    };
    service.create('org', input).subscribe();
    const call = http.expectOne(url);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(input);
    expect(call.request.body.clientId).toBeUndefined();
    expect(call.request.headers.has('If-Match')).toBe(false);
    call.flush(request);
  });
  it('updates description only using a quoted optimistic revision', () => {
    service.update('org', request, { title: 'Gauge repair', priority: 'high' }).subscribe();
    const call = http.expectOne(url + '/request');
    expect(call.request.method).toBe('PATCH');
    expect(call.request.headers.get('If-Match')).toBe('"revision-7"');
    expect(call.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(call.request.body).toEqual({ title: 'Gauge repair', priority: 'high' });
    call.flush(request);
  });
  it('qualifies a site-only target by explicit equipment selection and preserves stale conflict status', () => {
    let failure: unknown;
    service
      .qualify('org', request, { equipmentId: 'equipment', note: 'Repair required' })
      .subscribe({ error: (error: unknown) => (failure = error) });
    const call = http.expectOne(url + '/request/qualify');
    expect(call.request.headers.get('If-Match')).toBe('"revision-7"');
    expect(call.request.body).toEqual({ equipmentId: 'equipment', note: 'Repair required' });
    call.flush(
      { title: 'Revision conflict', detail: 'Review the current request' },
      { status: 412, statusText: 'Precondition Failed' },
    );
    expect(failure).toMatchObject({ status: 412, detail: 'Review the current request' });
  });
  it.each(['reject', 'cancel'] as const)(
    'sends a motivated %s command with the displayed revision',
    (action) => {
      service[action]('org', request, { reason: 'Not required' }).subscribe();
      const call = http.expectOne(url + '/request/' + action);
      expect(call.request.headers.get('If-Match')).toBe('"revision-7"');
      expect(call.request.body).toEqual({ reason: 'Not required' });
      call.flush(request);
    },
  );
  it('replays conversion with its stable command and original revision while linking existing real work', () => {
    const input = {
      clientOperationId: 'operation',
      existingInterventionId: 'intervention',
      existingTaskId: 'task',
    };
    service.convert('org', request, input).subscribe({ error: () => undefined });
    const first = http.expectOne(url + '/request/convert');
    expect(first.request.body).toEqual(input);
    first.error(new ProgressEvent('network'), { status: 0 });
    service.convert('org', request, input).subscribe();
    const replay = http.expectOne(url + '/request/convert');
    expect(replay.request.body).toEqual(input);
    expect(replay.request.headers.get('If-Match')).toBe('"revision-7"');
    replay.flush(
      serviceRequestFixture({
        status: 'converted',
        interventionId: 'intervention',
        taskId: 'task',
        revision: 8,
      }),
    );
  });
});
