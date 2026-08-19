import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
});
