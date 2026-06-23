import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { HydraCollection, HydraItem, ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
  CurrentOrganizationMemberProfileOutput,
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { OrganizationMemberService } from '../organization-member.service';

describe('OrganizationMemberService', () => {
  let service: OrganizationMemberService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const baseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/members`;
  const currentProfileUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/me`;

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

  const mockRole: OrganizationRoleOutput = {
    '@id': `/api/organizations/${orgId}/roles/role-uuid-1`,
    '@type': 'OrganizationRole',
    id: 'role-uuid-1',
    organizationId: orgId,
    name: 'Owner',
    description: 'Organization owner',
    isSystem: true,
    permissions: [
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    ],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const mockPermission: OrganizationPermissionOutput = {
    '@id': `/api/organizations/${orgId}/permissions/permission-uuid-1`,
    '@type': 'Permission',
    id: 'permission-uuid-1',
    name: ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    description: 'Write facility settings',
  };

  const mockCurrentProfile: CurrentOrganizationMemberProfileOutput = {
    '@id': `/api/organizations/${orgId}/me`,
    '@type': 'OrganizationMember',
    id: 'member-uuid-1',
    organizationId: orgId,
    userId: 'user-uuid-2',
    isActive: true,
    joinedAt: '2026-01-15T10:00:00+00:00',
    roles: [mockRole],
    permissions: [mockPermission],
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

  describe('getCurrentProfile', () => {
    it('should send GET request and return the current organization member profile', () => {
      service.getCurrentProfile(orgId).subscribe((response) => {
        expect(response.id).toBe('member-uuid-1');
        expect(response.roles[0]?.name).toBe('Owner');
        expect(response.permissions[0]?.name).toBe(ORGANIZATION_PERMISSION.FACILITIES_WRITE);
      });

      const req = httpMock.expectOne(currentProfileUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCurrentProfile);
    });

    it('should handle not found when the authenticated user is not an active member', () => {
      service.getCurrentProfile(orgId).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(currentProfileUrl);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
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

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should send DELETE request for the member', () => {
      service.remove(orgId, 'member-uuid-1').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/member-uuid-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });

    it('should handle not found errors', () => {
      service.remove(orgId, 'missing-member').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/missing-member`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });
});
