import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrganizationLegalProfileService } from './organization-legal-profile.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import type { ApiError } from '@core/models/api';

describe('OrganizationLegalProfileService', () => {
  let service: OrganizationLegalProfileService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const legalProfileUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/legal-profile`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationLegalProfileService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(OrganizationLegalProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockLegalProfile: OrganizationLegalProfileOutput = {
    '@id': `/api/organizations/${orgId}/legal-profile`,
    '@type': 'LegalProfile',
    organizationId: orgId,
    legalName: 'Fireguard SAS',
    legalType: 'sas',
    countryCode: 'FR',
    registrationNumber: '123 456 789',
    vatNumber: 'FR12345678901',
    address: '1 Rue de la Paix, 75001 Paris',
    requirements: {
      registrationNumber: { required: false, label: null, pattern: null, example: null },
      vatNumber: { required: false, label: null, pattern: null, example: null },
    },
  };

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return legal profile', () => {
      service.get(orgId).subscribe((profile) => {
        expect(profile.legalName).toBe('Fireguard SAS');
        expect(profile.countryCode).toBe('FR');
      });

      const req = httpMock.expectOne(legalProfileUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockLegalProfile);
    });

    it('should handle not found when no legal profile created yet', () => {
      service.get(orgId).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(legalProfileUrl);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── upsert ─────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    const input: UpsertOrganizationLegalProfileInput = {
      legalName: 'Fireguard SAS',
      legalType: 'sas',
      countryCode: 'FR',
      registrationNumber: '123 456 789',
      vatNumber: 'FR12345678901',
      address: '1 Rue de la Paix, 75001 Paris',
    };

    it('should send PUT request and return upserted legal profile', () => {
      service.upsert(orgId, input).subscribe((profile) => {
        expect(profile.legalName).toBe('Fireguard SAS');
      });

      const req = httpMock.expectOne(legalProfileUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockLegalProfile);
    });

    it('should handle validation error', () => {
      service.upsert(orgId, { ...input, countryCode: '' }).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(legalProfileUrl);
      req.flush({ status: 422, title: 'Unprocessable Entity' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});
