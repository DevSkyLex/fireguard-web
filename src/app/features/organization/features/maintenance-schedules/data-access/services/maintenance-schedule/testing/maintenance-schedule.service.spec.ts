import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry } from 'rxjs';
import type { ApiRequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceCampaignOutput,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceScheduleService } from '../maintenance-schedule.service';

describe('MaintenanceScheduleService', () => {
  let service: MaintenanceScheduleService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgIri = '/api/organizations/org-uuid-1';
  const scheduleId = 'schedule-uuid-1';
  const schedulesUrl = `${mockEnv.apiUrl}/api/maintenance/schedules`;
  const campaignsUrl = `${mockEnv.apiUrl}/api/maintenance/campaigns`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaintenanceScheduleService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(MaintenanceScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockSchedule: MaintenanceScheduleOutput = {
    '@id': `/api/maintenance/schedules/${scheduleId}`,
    '@type': 'MaintenanceSchedule',
    id: scheduleId,
    organization: orgIri,
    equipment: '/api/equipment/equipment-uuid-1',
    equipmentType: 'fire_extinguisher',
    dueStatus: 'due_soon',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const mockCollection = (
    items: MaintenanceScheduleOutput[],
  ): HydraCollection<MaintenanceScheduleOutput> => ({
    '@context': '/api/contexts/Collection',
    '@id': schedulesUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
  });

  describe('list', () => {
    it('should send the required organization filter as a query param', () => {
      service.list({ organization: orgIri }).subscribe((response) => {
        expect(response.member).toEqual([mockSchedule]);
      });

      const req = httpMock.expectOne((r) => r.url === schedulesUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.get('organization')).toBe(orgIri);
      req.flush(mockCollection([mockSchedule]));
    });

    it('should send facility, equipmentType, dueStatus and dueBefore when provided', () => {
      service
        .list({
          organization: orgIri,
          facility: '/api/facilities/facility-uuid-1',
          equipmentType: 'smoke_detector',
          dueStatus: 'overdue',
          dueBefore: '2026-12-31T00:00:00+00:00',
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === schedulesUrl);
      expect(req.request.params.get('facility')).toBe('/api/facilities/facility-uuid-1');
      expect(req.request.params.get('equipmentType')).toBe('smoke_detector');
      expect(req.request.params.get('dueStatus')).toBe('overdue');
      expect(req.request.params.get('dueBefore')).toBe('2026-12-31T00:00:00+00:00');
      req.flush(mockCollection([]));
    });

    it('should forward a free-text search term', () => {
      service.list({ organization: orgIri, search: 'smoke detector' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === schedulesUrl);
      expect(req.request.params.get('search')).toBe('smoke detector');
      req.flush(mockCollection([]));
    });

    it('should propagate a request error untouched', () => {
      let captured: unknown;

      service
        .list({ organization: orgIri })
        .subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne((r) => r.url === schedulesUrl);
      req.flush({ status: 400, title: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

      expect(captured).toBeTruthy();
    });
  });

  describe('setIntervalOverride', () => {
    it('should PATCH the merge-patch content type with the new override', () => {
      service.setIntervalOverride(scheduleId, 'P6M').subscribe((response) => {
        expect(response).toEqual({ ...mockSchedule, intervalOverride: 'P6M' });
      });

      const req = httpMock.expectOne(`${schedulesUrl}/${scheduleId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      expect(req.request.body).toEqual({ intervalOverride: 'P6M' });
      req.flush({ ...mockSchedule, intervalOverride: 'P6M' });
    });

    it('should send an explicit null to clear the override, not omit the key', () => {
      service.setIntervalOverride(scheduleId, null).subscribe();

      const req = httpMock.expectOne(`${schedulesUrl}/${scheduleId}`);
      expect(req.request.body).toEqual({ intervalOverride: null });
      req.flush(mockSchedule);
    });
  });

  describe('generateCampaign', () => {
    const input: GenerateMaintenanceCampaignInput = {
      organization: orgIri,
      name: 'Q1 fire extinguisher round',
      dueBefore: '2026-06-30T00:00:00+00:00',
    };

    it('should POST the campaign scope and return the created intervention summary', () => {
      const result: MaintenanceCampaignOutput = {
        '@id': '',
        '@type': 'MaintenanceCampaignResult',
        interventionId: 'intervention-uuid-1',
        number: 42,
        workItemsCount: 7,
      };

      service.generateCampaign(input).subscribe((response) => {
        expect(response).toEqual(result);
      });

      const req = httpMock.expectOne(campaignsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(result);
    });

    it('should propagate a 422 no-match error untouched', () => {
      let captured: unknown;

      service.generateCampaign(input).subscribe({ error: (error: unknown) => (captured = error) });

      const req = httpMock.expectOne(campaignsUrl);
      req.flush(
        {
          status: 422,
          title: 'Unprocessable Entity',
          detail: 'No due maintenance schedules match the given filters.',
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(captured).toBeTruthy();
    });
  });

  describe('exportCsv', () => {
    it('reads the CSV export as a blob, scoped by the organization IRI param', () => {
      const content = new Blob(['csv-bytes'], { type: 'text/csv' });
      let result: Blob | undefined;

      service.exportCsv({ organization: '/api/organizations/org-1' }).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${schedulesUrl}/export` &&
          r.params.get('organization') === '/api/organizations/org-1' &&
          r.params.keys().length === 1,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.withCredentials).toBe(true);
      req.flush(content);

      expect(result).toEqual(content);
    });

    it('forwards facility, equipmentType and dueStatus as query params', () => {
      service
        .exportCsv({
          organization: '/api/organizations/org-1',
          facility: '/api/organizations/org-1/facilities/facility-1',
          equipmentType: 'extinguisher',
          dueStatus: 'overdue',
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${schedulesUrl}/export` &&
          r.params.get('facility') === '/api/organizations/org-1/facilities/facility-1' &&
          r.params.get('equipmentType') === 'extinguisher' &&
          r.params.get('dueStatus') === 'overdue',
      );
      expect(req.request.method).toBe('GET');
      req.flush(new Blob(['csv-bytes'], { type: 'text/csv' }));
    });
  });
  const effectfulExports = [
    {
      name: 'schedule CSV',
      url: `${schedulesUrl}/export`,
      invoke: (requestOptions?: ApiRequestOptions) =>
        service.exportCsv({ organization: orgIri, dueBefore: '2026-04-01' }, requestOptions),
    },
  ];

  it.each(effectfulExports)(
    'retains one binary GET identity across retries and resubscriptions for $name',
    ({ url, invoke }) => {
      const intent = invoke();
      const received = vi.fn();
      const content = new Blob(['export-bytes'], { type: 'application/octet-stream' });
      httpMock.expectNone(url);
      intent.pipe(retry(1)).subscribe(received);

      const initial = httpMock.expectOne((request) => request.url === url);
      const key = initial.request.headers.get('Idempotency-Key');
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(initial.request.method).toBe('GET');
      expect(initial.request.responseType).toBe('blob');
      expect(initial.request.body).toBeNull();
      expect(initial.request.withCredentials).toBe(true);
      expect(initial.request.params.has('idempotencyKey')).toBe(false);
      const query = initial.request.params.toString();
      initial.error(new ProgressEvent('error'));

      const retried = httpMock.expectOne((request) => request.url === url);
      expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
      expect(retried.request.params.toString()).toBe(query);
      retried.flush(content);
      expect(received).toHaveBeenLastCalledWith(content);

      intent.subscribe(received);
      const resubscribed = httpMock.expectOne((request) => request.url === url);
      expect(resubscribed.request.headers.get('Idempotency-Key')).toBe(key);
      resubscribed.flush(content);

      invoke().subscribe(received);
      const nextIntent = httpMock.expectOne((request) => request.url === url);
      expect(nextIntent.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/i);
      expect(nextIntent.request.headers.get('Idempotency-Key')).not.toBe(key);
      nextIntent.flush(content);
      expect(received).toHaveBeenCalledTimes(3);
    },
  );

  it.each(effectfulExports)(
    'forwards an explicit identity for manual binary GET retries of $name',
    ({ url, invoke }) => {
      const requestOptions: ApiRequestOptions = {
        idempotencyKey: '24316949-d384-4fa7-9f67-6b3af1c4bbce',
        headers: { 'X-Export-Trace': 'transport-check' },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        invoke(requestOptions).subscribe();
        const request = httpMock.expectOne((candidate) => candidate.url === url);
        expect(request.request.headers.get('Idempotency-Key')).toBe(requestOptions.idempotencyKey);
        expect(request.request.headers.get('X-Export-Trace')).toBe('transport-check');
        expect(request.request.params.has('idempotencyKey')).toBe(false);
        expect(request.request.params.has('headers')).toBe(false);
        request.flush(new Blob());
      }
    },
  );
});
