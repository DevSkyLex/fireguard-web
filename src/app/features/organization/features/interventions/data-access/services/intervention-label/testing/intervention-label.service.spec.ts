import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { InterventionLabelOutput } from '@features/organization/features/interventions/models';
import { InterventionLabelService } from '../intervention-label.service';

describe('InterventionLabelService', () => {
  let service: InterventionLabelService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  const label = {
    '@id': '/api/intervention-labels/label-1',
    '@type': 'InterventionLabel',
    id: 'label-1',
    organization: '/api/organizations/org-1',
    name: 'Urgent',
    color: '#ff0000',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  } as InterventionLabelOutput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionLabelService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(InterventionLabelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists labels scoped to an organization', () => {
    let result: InterventionLabelOutput[] = [];

    service.list('/api/organizations/org-1').subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/intervention-labels` &&
        req.params.get('organization') === '/api/organizations/org-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/intervention-labels',
      '@type': 'Collection',
      totalItems: 1,
      member: [label],
    });

    expect(result).toEqual([label]);
  });

  it('creates a label', () => {
    service
      .create({ organization: '/api/organizations/org-1', name: 'Urgent', color: '#ff0000' })
      .subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-labels`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      organization: '/api/organizations/org-1',
      name: 'Urgent',
      color: '#ff0000',
    });
    request.flush(label);
  });

  it('merge-patches a label', () => {
    service.update('label-1', { color: '#00ff00' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-labels/label-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ color: '#00ff00' });
    request.flush({ ...label, color: '#00ff00' });
  });

  it('deletes a label', () => {
    service.remove('label-1').subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-labels/label-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
