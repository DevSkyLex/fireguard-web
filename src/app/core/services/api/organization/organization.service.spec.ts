import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ApiError,
} from '@core/models/api';
import type {
  FacilityTypeOption,
  FacilityOutput,
  CreateFirstFacilityOnboardingInput,
  CreateOnboardingOrganizationInput,
  OrganizationLegalProfileOutput,
  OrganizationLegalTypeOption,
  OrganizationOnboardingStatusOutput,
  OrganizationOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/organizations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get onboarding status', () => {
    const statusResponse: OrganizationOnboardingStatusOutput = {
      state: 'in_progress',
      nextStep: 'create_organization',
      blockedReason: null,
      steps: [
        {
          key: 'create_organization',
          label: 'Create organization',
          status: 'pending',
          required: true,
          available: true,
          reason: null,
        },
        {
          key: 'complete_legal_profile',
          label: 'Complete legal profile',
          status: 'blocked',
          required: true,
          available: false,
          reason: 'organization_required',
        },
        {
          key: 'create_first_facility',
          label: 'Create first facility',
          status: 'blocked',
          required: false,
          available: false,
          reason: 'organization_required',
        },
      ],
      targetOrganizationId: null,
      targetOrganizationName: null,
    };

    service.getOnboardingStatus().subscribe((response) => {
      expect(response.nextStep).toBe('create_organization');
      expect(response.state).toBe('in_progress');
    });

    const req = httpMock.expectOne(`${baseUrl}/onboarding/status`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Accept')).toBe('application/ld+json');
    req.flush(statusResponse);
  });

  it('should list organization legal types', () => {
    const responsePayload: readonly OrganizationLegalTypeOption[] = [
      {
        value: 'company',
        label: 'Company',
        requirements: {
          registrationNumber: { required: true },
          vatNumber: { required: false },
        },
      },
      {
        value: 'individual',
        label: 'Individual',
        requirements: {
          registrationNumber: { required: false },
          vatNumber: { required: false },
        },
      },
    ];

    service.listOrganizationLegalTypes().subscribe((response) => {
      expect(response).toEqual(responsePayload);
    });

    const req = httpMock.expectOne(`${baseUrl}/legal-types`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(responsePayload);
  });

  it('should list facility types', () => {
    const responsePayload: readonly FacilityTypeOption[] = [
      { value: 'site', label: 'Site' },
      { value: 'building', label: 'Building' },
    ];

    service.listFacilityTypes().subscribe((response) => {
      expect(response).toEqual(responsePayload);
    });

    const req = httpMock.expectOne(`${mockEnv.apiUrl}/api/facilities/types`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(responsePayload);
  });

  it('should upsert organization legal profile', () => {
    const organizationId = 'org-123';
    const payload: UpsertOrganizationLegalProfileInput = {
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS-PAR-123456789',
      vatNumber: 'FR00123456789',
    };
    const responsePayload: OrganizationLegalProfileOutput = {
      organizationId,
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS-PAR-123456789',
      vatNumber: 'FR00123456789',
      requirements: {
        registrationNumber: { required: true },
        vatNumber: { required: false },
      },
      createdAt: '2026-02-17T13:00:00.000Z',
      updatedAt: '2026-02-17T13:00:00.000Z',
    };

    service.upsertOrganizationLegalProfile(organizationId, payload).subscribe((response) => {
      expect(response).toEqual(responsePayload);
    });

    const req = httpMock.expectOne(`${baseUrl}/${organizationId}/legal-profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);
    req.flush(responsePayload);
  });

  it('should create onboarding organization', () => {
    const payload: CreateOnboardingOrganizationInput = {
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
    };
    const responsePayload: OrganizationOutput = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
      ownerUserId: '550e8400-e29b-41d4-a716-446655440002',
      createdByUserId: '550e8400-e29b-41d4-a716-446655440002',
      status: 'active',
      isActive: true,
      createdAt: '2026-02-17T13:00:00.000Z',
      updatedAt: '2026-02-17T13:00:00.000Z',
    };

    service.createOnboardingOrganization(payload).subscribe((response) => {
      expect(response).toEqual(responsePayload);
    });

    const req = httpMock.expectOne(`${baseUrl}/onboarding/organization`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);
    req.flush(responsePayload);
  });

  it('should create first facility onboarding', () => {
    const organizationId = 'org-123';
    const payload: CreateFirstFacilityOnboardingInput = {
      type: 'site',
      name: 'Headquarters',
      code: 'SITE-PAR-001',
      address: '10 rue de Rivoli, Paris',
      metadata: {
        country: 'FR',
        timezone: 'Europe/Paris',
      },
    };
    const responsePayload: FacilityOutput = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      organizationId,
      parentFacilityId: null,
      type: 'site',
      name: 'Headquarters',
      code: 'SITE-PAR-001',
      status: 'active',
      address: '10 rue de Rivoli, Paris',
      metadata: {
        country: 'FR',
        timezone: 'Europe/Paris',
      },
      createdAt: '2026-02-17T13:00:00.000Z',
      updatedAt: '2026-02-17T13:00:00.000Z',
    };

    service.createFirstFacilityOnboarding(organizationId, payload).subscribe((response) => {
      expect(response).toEqual(responsePayload);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/${organizationId}/onboarding/first-facility`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.parentFacilityId).toBeUndefined();
    expect(req.request.withCredentials).toBe(true);
    req.flush(responsePayload);
  });

  it('should propagate slug conflict as API error', () => {
    const payload: CreateOnboardingOrganizationInput = {
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
    };
    const errorResponse: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 409,
      type: 'https://api.test.com/errors/conflict',
      title: 'Conflict',
      detail: 'Slug already exists.',
      instance: null,
    };

    service.createOnboardingOrganization(payload).subscribe({
      error: (error: ApiError) => {
        expect(error.status).toBe(409);
        expect(error.detail).toContain('Slug');
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/onboarding/organization`);
    req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
  });
});
