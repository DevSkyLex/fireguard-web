import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { InterventionTemplateOutput } from '@features/organization/features/interventions/models';
import { InterventionTemplateService } from '../intervention-template.service';

describe('InterventionTemplateService', () => {
  let service: InterventionTemplateService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  const template = {
    '@id': '/api/intervention-templates/template-1',
    '@type': 'InterventionTemplate',
    id: 'template-1',
    organization: '/api/organizations/org-1',
    name: 'Annual inspection round',
    description: null,
    type: 'inspection_campaign',
    priority: 'normal',
    defaultSite: null,
    defaultResponsible: null,
    duration: 'P14D',
    labelIds: [],
    items: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  } as InterventionTemplateOutput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionTemplateService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(InterventionTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists templates scoped to an organization', () => {
    let result: InterventionTemplateOutput[] = [];

    service.list('/api/organizations/org-1').subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/intervention-templates` &&
        req.params.get('organization') === '/api/organizations/org-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/intervention-templates',
      '@type': 'Collection',
      totalItems: 1,
      member: [template],
    });

    expect(result).toEqual([template]);
  });

  it('forwards the search filter', () => {
    service.list('/api/organizations/org-1', { search: 'annual' }).subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/intervention-templates` &&
        req.params.get('search') === 'annual',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/intervention-templates',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('instantiates a template with an empty body when no overrides are given', () => {
    service.instantiate('template-1').subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-templates/template-1/instantiate`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ interventionId: 'intervention-1', number: 42 });
  });

  it('forwards the override fields, converting plannedStartAt to a seconds-precision UTC string', () => {
    service
      .instantiate('template-1', {
        name: 'Spring round',
        site: '/api/facilities/site-1',
        responsible: '/api/organizations/org-1/members/member-1',
        plannedStartAt: new Date('2026-03-01T09:30:00.000Z'),
      })
      .subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-templates/template-1/instantiate`,
    );
    expect(request.request.body).toEqual({
      name: 'Spring round',
      site: '/api/facilities/site-1',
      responsible: '/api/organizations/org-1/members/member-1',
      plannedStartAt: '2026-03-01T09:30:00Z',
    });
    request.flush({ interventionId: 'intervention-1', number: 42 });
  });

  it('propagates an instantiate error untouched', () => {
    let error: unknown;

    service.instantiate('template-1').subscribe({ error: (err: unknown) => (error = err) });

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-templates/template-1/instantiate`,
    );
    request.flush(
      { status: 404, title: 'Not Found', type: '/errors/not-found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect((error as { status?: number }).status).toBe(404);
  });
});
