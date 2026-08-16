import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ComplianceTreeNodeOutput } from '@features/organization/features/facilities/models';
import { ComplianceTreeService } from '../compliance-tree.service';

describe('ComplianceTreeService', () => {
  let service: ComplianceTreeService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ComplianceTreeService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ComplianceTreeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const node: ComplianceTreeNodeOutput = {
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    name: 'HQ',
    type: 'site',
    parentFacilityId: null,
    equipmentCount: 4,
    status: 'active',
    complianceRate: 92,
    children: [],
  };

  it('requests the organization facility tree', () => {
    service.getTree(orgId).subscribe();

    const req = httpMock.expectOne(`${mockEnv.apiUrl}/api/organizations/${orgId}/facility-tree`);
    expect(req.request.method).toBe('GET');
    req.flush({ '@id': '/api/collection', '@type': 'Collection', member: [node], totalItems: 1 });
  });

  it('propagates a transport error', () => {
    let error: { status: number } | undefined;
    service.getTree(orgId).subscribe({ error: (err: { status: number }) => (error = err) });

    const req = httpMock.expectOne(`${mockEnv.apiUrl}/api/organizations/${orgId}/facility-tree`);
    req.flush(
      {
        '@id': '/errors/1',
        '@type': 'Error',
        status: 500,
        type: 'about:blank',
        title: 'Down',
        detail: 'Server error',
      },
      { status: 500, statusText: 'Server Error' },
    );

    expect(error?.status).toBe(500);
  });
});
