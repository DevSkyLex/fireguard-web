import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { InterventionRecurrenceOutput } from '@features/organization/features/interventions/models';
import { InterventionRecurrenceService } from '../intervention-recurrence.service';

describe('InterventionRecurrenceService', () => {
  let service: InterventionRecurrenceService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  const recurrence = {
    '@id': '/api/intervention-recurrences/recurrence-1',
    '@type': 'InterventionRecurrence',
    id: 'recurrence-1',
    organization: '/api/organizations/org-1',
    template: '/api/intervention-templates/template-1',
    name: 'Monthly extinguisher check',
    site: null,
    responsible: null,
    frequency: 'monthly',
    interval: 1,
    anchorDate: '2026-01-15T00:00:00Z',
    timezone: 'Europe/Paris',
    leadTimeDays: 7,
    nextOccurrenceAt: '2026-02-15T00:00:00Z',
    lastMaterializedAt: null,
    isActive: true,
    endAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as InterventionRecurrenceOutput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionRecurrenceService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(InterventionRecurrenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists recurrences scoped to an organization', () => {
    let result: InterventionRecurrenceOutput[] = [];

    service.list('/api/organizations/org-1').subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/intervention-recurrences` &&
        req.params.get('organization') === '/api/organizations/org-1' &&
        !req.params.has('isActive'),
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/intervention-recurrences',
      '@type': 'Collection',
      totalItems: 1,
      member: [recurrence],
    });

    expect(result).toEqual([recurrence]);
  });

  it('forwards the isActive filter when set', () => {
    service.list('/api/organizations/org-1', { isActive: false }).subscribe();

    const request = httpMock.expectOne((req) => req.params.get('isActive') === 'false');
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/intervention-recurrences',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('creates a recurrence, converting dates to seconds-precision UTC', () => {
    service
      .create({
        organization: '/api/organizations/org-1',
        template: '/api/intervention-templates/template-1',
        name: 'Monthly extinguisher check',
        anchorDate: new Date('2026-01-15T00:00:00.000Z'),
      })
      .subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-recurrences`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      organization: '/api/organizations/org-1',
      template: '/api/intervention-templates/template-1',
      name: 'Monthly extinguisher check',
      anchorDate: '2026-01-15T00:00:00Z',
    });
    request.flush(recurrence);
  });

  it('merge-patches a recurrence, including a null clearing endAt', () => {
    service.update('recurrence-1', { endAt: null, isActive: false }).subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-recurrences/recurrence-1`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ endAt: null, isActive: false });
    request.flush({ ...recurrence, isActive: false });
  });

  it('deletes a recurrence', () => {
    service.remove('recurrence-1').subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-recurrences/recurrence-1`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
