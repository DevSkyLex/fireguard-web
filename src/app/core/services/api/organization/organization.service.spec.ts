import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrganizationService } from './organization.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  OrganizationOutput,
  CreateOrganizationInput,
  OrganizationInvitationOutput,
  OrganizationStatisticsOutput,
  OrganizationCountryOutput,
  OrganizationLegalTypeOutput,
  OrganizationPermissionOutput,
} from '@core/models/organization';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

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

  const mockOrg: OrganizationOutput = {
    '@id': '/api/organizations/org-uuid-1',
    '@type': 'Organization',
    id: 'org-uuid-1',
    name: 'Fireguard Inc.',
    slug: 'fireguard-inc',
    ownerUserId: 'user-uuid-1',
    createdByUserId: 'user-uuid-1',
    status: 'active',
    isActive: true,
    memberCount: 5,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': '/api/organizations',
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': '/api/organizations?page=1', '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return organizations collection', () => {
      const mockResponse = mockCollection([mockOrg]);

      service.list().subscribe((response) => {
        expect(response.member).toEqual([mockOrg]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should send GET request with pagination options', () => {
      service.list({ page: 2, itemsPerPage: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('10');
      req.flush(mockCollection([]));
    });

    it('should handle API error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.2',
        title: 'Unauthorized',
        detail: 'Full authentication is required.',
        instance: null,
      };

      service.list().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return single organization', () => {
      service.get('org-uuid-1').subscribe((org) => {
        expect(org).toEqual(mockOrg);
      });

      const req = httpMock.expectOne(`${baseUrl}/org-uuid-1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockOrg);
    });

    it('should handle not found error', () => {
      service.get('nonexistent').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateOrganizationInput = {
      name: 'New Org',
      slug: 'new-org',
    };

    it('should send POST request with input and return created organization', () => {
      service.create(input).subscribe((org) => {
        expect(org.name).toBe('New Org');
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush({ ...mockOrg, name: 'New Org' });
    });

    it('should handle validation error', () => {
      service.create(input).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ status: 422, title: 'Unprocessable Entity' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  // ── listInvitations ────────────────────────────────────────────────────────

  describe('listInvitations', () => {
    const mockInvitation: OrganizationInvitationOutput = {
      '@id': '/api/organizations/org-uuid-1/invitations/inv-uuid-1',
      '@type': 'Invitation',
      id: 'inv-uuid-1',
      organizationId: 'org-uuid-1',
      email: 'invited@example.com',
      status: 'pending',
      invitedByUserId: 'user-uuid-1',
      acceptedByUserId: null,
      revokedByUserId: null,
      expiresAt: '2026-04-01T00:00:00+00:00',
      createdAt: '2026-03-01T00:00:00+00:00',
      updatedAt: '2026-03-01T00:00:00+00:00',
      roleIds: [],
    };

    it('should send GET request and return invitations collection', () => {
      service.listInvitations('org-uuid-1').subscribe((response) => {
        expect(response.member.length).toBe(1);
        expect(response.member[0].email).toBe('invited@example.com');
      });

      const req = httpMock.expectOne(`${baseUrl}/org-uuid-1/invitations`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockInvitation]));
    });
  });

  // ── revokeInvitation ───────────────────────────────────────────────────────

  describe('revokeInvitation', () => {
    it('should send POST action request to revoke invitation', () => {
      const mockRevoked = {
        '@id': '/api/organizations/org-uuid-1/invitations/inv-uuid-1',
        '@type': 'Invitation',
        id: 'inv-uuid-1',
        organizationId: 'org-uuid-1',
        email: 'invited@example.com',
        status: 'revoked',
      };

      service.revokeInvitation('org-uuid-1', 'inv-uuid-1').subscribe((response) => {
        expect(response.status).toBe('revoked');
      });

      const req = httpMock.expectOne(`${baseUrl}/org-uuid-1/invitations/inv-uuid-1/revoke`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockRevoked);
    });
  });

  // ── getStatistics ──────────────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('should send GET request and return organization statistics', () => {
      const mockStats: OrganizationStatisticsOutput = {
        '@id': '/api/organizations/org-uuid-1/statistics',
        '@type': 'Statistics',
        memberCount: 5,
        roleCount: 2,
        facilityCount: 3,
        activeFacilityCount: 2,
        pendingInvitationCount: 1,
      };

      service.getStatistics('org-uuid-1').subscribe((stats) => {
        expect(stats.memberCount).toBe(5);
      });

      const req = httpMock.expectOne(`${baseUrl}/org-uuid-1/statistics`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockStats);
    });
  });

  // ── listCountries ──────────────────────────────────────────────────────────

  describe('listCountries', () => {
    it('should send GET request and return countries collection', () => {
      const mockCountry: OrganizationCountryOutput = {
        '@id': '/api/organizations/countries/FR',
        '@type': 'Country',
        code: 'FR',
        name: 'France',
        flagUrl: 'https://api.test.com/flags/FR.svg',
      };

      service.listCountries().subscribe((response) => {
        expect(response.member.length).toBe(1);
        expect(response.member[0].code).toBe('FR');
      });

      const req = httpMock.expectOne(`${baseUrl}/countries`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockCountry]));
    });
  });

  // ── listLegalTypes ─────────────────────────────────────────────────────────

  describe('listLegalTypes', () => {
    it('should send GET request without countryCode filter', () => {
      service.listLegalTypes().subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/legal-types`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('countryCode')).toBe(false);
      req.flush(mockCollection([]));
    });

    it('should send GET request with countryCode filter', () => {
      service.listLegalTypes('FR').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/legal-types`);
      expect(req.request.params.get('countryCode')).toBe('FR');
      req.flush(mockCollection([]));
    });

    it('should return legal types', () => {
      const mockLegalType: OrganizationLegalTypeOutput = {
        '@id': '/api/organizations/legal-types/sas',
        '@type': 'LegalType',
        value: 'sas',
        label: 'Société par Actions Simplifiée',
        countryCode: 'FR',
        requirements: {
          registrationNumber: { required: true, label: null, pattern: null, example: null },
          vatNumber: { required: false, label: null, pattern: null, example: null },
        },
      };

      service.listLegalTypes('FR').subscribe((response) => {
        expect(response.member[0].value).toBe('sas');
      });

      const req = httpMock.expectOne((r) => r.url === `${baseUrl}/legal-types`);
      req.flush(mockCollection([mockLegalType]));
    });
  });

  // ── listPermissions ────────────────────────────────────────────────────────

  describe('listPermissions', () => {
    it('should send GET request and return permissions collection', () => {
      const mockPermission: OrganizationPermissionOutput = {
        '@id': '/api/organizations/org-uuid-1/permissions/perm-uuid-1',
        '@type': 'Permission',
        id: 'perm-uuid-1',
        name: 'facility:read',
        description: 'Read facilities',
      };

      service.listPermissions('org-uuid-1').subscribe((response) => {
        expect(response.member.length).toBe(1);
        expect(response.member[0].name).toBe('facility:read');
      });

      const req = httpMock.expectOne(`${baseUrl}/org-uuid-1/permissions`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockPermission]));
    });
  });
});
