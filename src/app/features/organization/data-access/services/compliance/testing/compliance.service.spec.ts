import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';
import { ComplianceService } from '../compliance.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/organizations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ComplianceService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ComplianceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockTree: ComplianceFacilityTreeOutput = {
    '@id': '/api/organizations/org-1/facility-tree',
    '@type': 'FacilityTree',
    organizationId: 'org-1',
    generatedAt: '2026-08-16T00:00:00+00:00',
    nodes: [],
  };

  const mockSummary: ComplianceSummaryOutput = {
    '@id': '/api/organizations/org-1/compliance',
    '@type': 'ComplianceSummary',
    organizationId: 'org-1',
    generatedAt: '2026-08-16T00:00:00+00:00',
    organizationStatus: 'compliant',
    totals: {
      totalEquipmentCount: 0,
      activeEquipmentCount: 0,
      upToDateEquipmentCount: 0,
      dueSoonEquipmentCount: 0,
      overdueEquipmentCount: 0,
      unscheduledEquipmentCount: 0,
      trackedEquipmentCount: 0,
      complianceRate: null,
      openLowNonConformityCount: 0,
      openMediumNonConformityCount: 0,
      openHighNonConformityCount: 0,
      openCriticalNonConformityCount: 0,
    },
    facilities: [],
  };

  it('reads the enriched facility hierarchy', () => {
    let result: ComplianceFacilityTreeOutput | undefined;

    service.getFacilityTree('org-1').subscribe((tree) => (result = tree));

    const request = httpMock.expectOne(`${baseUrl}/org-1/facility-tree`);
    expect(request.request.method).toBe('GET');
    request.flush(mockTree);

    expect(result).toEqual(mockTree);
  });

  it('reads the organization-wide compliance summary', () => {
    let result: ComplianceSummaryOutput | undefined;

    service.getOrganizationCompliance('org-1').subscribe((summary) => (result = summary));

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance`);
    expect(request.request.method).toBe('GET');
    request.flush(mockSummary);

    expect(result).toEqual(mockSummary);
  });

  it('reads a single facility compliance summary', () => {
    let result: ComplianceSummaryOutput | undefined;

    service.getFacilityCompliance('org-1', 'facility-1').subscribe((summary) => (result = summary));

    const request = httpMock.expectOne(`${baseUrl}/org-1/facilities/facility-1/compliance`);
    expect(request.request.method).toBe('GET');
    request.flush({ ...mockSummary, facilityId: 'facility-1' });

    expect(result?.facilityId).toBe('facility-1');
  });

  it('reads the organization safety register export as a blob via GET responseType blob', () => {
    const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    let result: Blob | undefined;

    service.exportOrganizationSafetyRegister('org-1').subscribe((blob) => (result = blob));

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance/export`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });

  it('reads a facility safety register export as a blob via GET responseType blob', () => {
    const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    let result: Blob | undefined;

    service
      .exportFacilitySafetyRegister('org-1', 'facility-1')
      .subscribe((blob) => (result = blob));

    const request = httpMock.expectOne(`${baseUrl}/org-1/facilities/facility-1/compliance/export`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });
});
