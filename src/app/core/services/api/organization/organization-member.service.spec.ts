import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrganizationMemberService } from './organization-member.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { OrganizationMemberOutput, AddOrganizationMemberInput } from '@core/models/organization';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

describe('OrganizationMemberService', () => {
  let service: OrganizationMemberService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const baseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/members`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationMemberService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(OrganizationMemberService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockMember: OrganizationMemberOutput = {
    '@id': `/api/organizations/${orgId}/members/member-uuid-1`,
    '@type': 'OrganizationMember',
    id: 'member-uuid-1',
    organizationId: orgId,
    userId: 'user-uuid-2',
    isActive: true,
    joinedAt: '2026-01-15T10:00:00+00:00',
    roleIds: ['role-uuid-1'],
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': baseUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${baseUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return members collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockMember]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockMember]));
    });

    it('should send GET request with pagination options', () => {
      service.list(orgId, { page: 1, itemsPerPage: 20 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('itemsPerPage')).toBe('20');
      req.flush(mockCollection([]));
    });

    it('should handle unauthorized error', () => {
      service.list(orgId).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(403);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ── add ────────────────────────────────────────────────────────────────────

  describe('add', () => {
    const input: AddOrganizationMemberInput = {
      userId: 'user-uuid-2',
      roleIds: ['role-uuid-1'],
    };

    it('should send POST request and return added member', () => {
      service.add(orgId, input).subscribe((member) => {
        expect(member.userId).toBe('user-uuid-2');
        expect(member.roleIds).toEqual(['role-uuid-1']);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockMember);
    });

    it('should handle conflict when user is already a member', () => {
      service.add(orgId, input).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
  });
});
