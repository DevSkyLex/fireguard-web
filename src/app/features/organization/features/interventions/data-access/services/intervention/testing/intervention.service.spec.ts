import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  InterventionOutput,
  InterventionWorkItemOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import { InterventionService } from '../intervention.service';

describe('InterventionService', () => {
  let service: InterventionService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(InterventionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads an asynchronous publication by its canonical resource URL', () => {
    const publication = {
      '@id': '/api/publications/publication-1',
      '@type': 'Publication',
      id: 'publication-1',
      status: 'processing',
    } as PublicationOutput;

    service
      .getPublication(publication.id)
      .subscribe((result) => expect(result).toEqual(publication));

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/publications/${publication.id}`);
    expect(request.request.method).toBe('GET');
    request.flush(publication);
  });

  it('uses conditional PUT for offline work-item creation', () => {
    service
      .createWorkItem({
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        source: 'discovered',
        required: false,
      })
      .subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-work-items/work-item-client-id`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-None-Match')).toBe('*');
    expect(request.request.body).not.toHaveProperty('clientId');
    request.flush({});
  });

  it('uses the persisted revision for intervention patches', () => {
    service.update('intervention-1', { status: 'planned' }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-7"');
    request.flush({});
  });

  it('preserves explicit null values in intervention patches', () => {
    service.update('intervention-1', { responsible: null, dueAt: null }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.body).toEqual({ responsible: null, dueAt: null });
    request.flush({});
  });

  it('loads every work-item page for the field workspace', () => {
    const first = { id: 'work-item-1' } as InterventionWorkItemOutput;
    const second = { id: 'work-item-101' } as InterventionWorkItemOutput;
    let result: readonly InterventionWorkItemOutput[] = [];

    service.listAllWorkItems('intervention-1').subscribe((items) => {
      result = items;
    });

    const firstRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/intervention-work-items` &&
        request.params.get('page') === '1' &&
        request.params.get('itemsPerPage') === '100',
    );
    firstRequest.flush({
      '@id': '/api/intervention-work-items',
      '@type': 'Collection',
      totalItems: 101,
      member: [first],
    });

    const secondRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/intervention-work-items` &&
        request.params.get('page') === '2',
    );
    secondRequest.flush({
      '@id': '/api/intervention-work-items?page=2',
      '@type': 'Collection',
      totalItems: 101,
      member: [second],
    });

    expect(result).toEqual([first, second]);
  });

  it('loads every assigned intervention page for offline prefetch', () => {
    const first = { id: 'intervention-1' } as InterventionOutput;
    const second = { id: 'intervention-101' } as InterventionOutput;
    let result: readonly InterventionOutput[] = [];

    service
      .listAll('organization-1', { responsible: '/api/members/member-1' })
      .subscribe((interventions) => {
        result = interventions;
      });

    const firstRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('page') === '1' &&
        request.params.get('itemsPerPage') === '100' &&
        request.params.get('responsible') === '/api/members/member-1',
    );
    firstRequest.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 101,
      member: [first],
    });

    const secondRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('page') === '2' &&
        request.params.get('responsible') === '/api/members/member-1',
    );
    secondRequest.flush({
      '@id': '/api/interventions?page=2',
      '@type': 'Collection',
      totalItems: 101,
      member: [second],
    });

    expect(result).toEqual([first, second]);
  });
});
