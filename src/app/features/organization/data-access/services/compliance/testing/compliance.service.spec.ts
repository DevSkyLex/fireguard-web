import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
  SafetyRegisterSnapshotOutput,
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

  const mockSnapshot: SafetyRegisterSnapshotOutput = {
    '@id': '/api/organizations/org-1/compliance/register-snapshots/snap-1',
    '@type': 'SafetyRegisterSnapshot',
    id: 'snap-1',
    organizationId: 'org-1',
    scope: 'organization',
    generatedAt: '2026-08-27T10:00:00+00:00',
    generatedByUserId: 'user-1',
    contentHash: 'a'.repeat(64),
    sizeBytes: 12_345,
    createdAt: '2026-08-27T10:00:00+00:00',
  };

  it('archives the organization-wide register via POST with an empty body', () => {
    let result: SafetyRegisterSnapshotOutput | undefined;

    service.createRegisterSnapshot('org-1', {}).subscribe((snapshot) => (result = snapshot));

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance/register-snapshots`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(mockSnapshot);

    expect(result).toEqual(mockSnapshot);
  });

  it('archives a facility-scoped register via POST with the facilityId in the body', () => {
    let result: SafetyRegisterSnapshotOutput | undefined;

    service
      .createRegisterSnapshot('org-1', { facilityId: 'facility-1' })
      .subscribe((snapshot) => (result = snapshot));

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance/register-snapshots`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ facilityId: 'facility-1' });
    request.flush({ ...mockSnapshot, scope: 'facility', facilityId: 'facility-1' });

    expect(result?.scope).toBe('facility');
    expect(result?.facilityId).toBe('facility-1');
  });

  it('lists the archived register snapshots as a Hydra collection', () => {
    const page: HydraCollection<SafetyRegisterSnapshotOutput> = {
      '@id': '/api/organizations/org-1/compliance/register-snapshots',
      '@type': 'Collection',
      member: [mockSnapshot],
      totalItems: 1,
    };
    let result: HydraCollection<SafetyRegisterSnapshotOutput> | undefined;

    service.listRegisterSnapshots('org-1').subscribe((collection) => (result = collection));

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance/register-snapshots`);
    expect(request.request.method).toBe('GET');
    request.flush(page);

    expect(result).toEqual(page);
  });

  it('downloads one archived snapshot as a blob via GET responseType blob', () => {
    const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    let result: Blob | undefined;

    service.downloadRegisterSnapshot('org-1', 'snap-1').subscribe((blob) => (result = blob));

    const request = httpMock.expectOne(
      `${baseUrl}/org-1/compliance/register-snapshots/snap-1/download`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });

  it('propagates the archive error untouched so the store can normalize it', () => {
    let caught: unknown;

    service.createRegisterSnapshot('org-1', {}).subscribe({ error: (error) => (caught = error) });

    const request = httpMock.expectOne(`${baseUrl}/org-1/compliance/register-snapshots`);
    request.flush(
      { '@type': 'Error', status: 403, detail: 'Plan not entitled' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(caught).toEqual({ '@type': 'Error', status: 403, detail: 'Plan not entitled' });
  });
});
