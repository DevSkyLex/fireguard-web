import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { HydraCollection, HydraItem, ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  OrganizationRoleOutput,
  OrganizationMemberOutput,
  CreateOrganizationRoleInput,
  UpdateOrganizationRoleInput,
  AssignOrganizationRoleInput,
  ReplaceOrganizationMemberRolesInput,
} from '@features/organization/models';
import { OrganizationRoleService } from '../organization-role.service';

describe('OrganizationRoleService', () => {
  let service: OrganizationRoleService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const rolesUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/roles`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationRoleService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(OrganizationRoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockRole: OrganizationRoleOutput = {
    '@id': `/api/organizations/${orgId}/roles/role-uuid-1`,
    '@type': 'OrganizationRole',
    id: 'role-uuid-1',
    organizationId: orgId,
    name: 'Manager',
    description: 'Can manage facilities',
    isSystem: false,
    permissions: [
      { name: 'facility:read', description: 'Read facilities' },
      { name: 'facility:write', description: 'Write facilities' },
    ],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': rolesUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${rolesUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return roles collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockRole]);
      });

      const req = httpMock.expectOne(rolesUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockRole]));
    });

    it('should handle API error', () => {
      service.list(orgId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(403),
      });

      const req = httpMock.expectOne(rolesUrl);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  // ── listAll ────────────────────────────────────────────────────────────────

  describe('listAll', () => {
    it('should walk every server page and emit the concatenated role list', () => {
      const second: OrganizationRoleOutput = { ...mockRole, id: 'role-uuid-2', name: 'Inspector' };
      let result: readonly OrganizationRoleOutput[] = [];

      service.listAll(orgId).subscribe((roles) => {
        result = roles;
      });

      const firstRequest = httpMock.expectOne(
        (request) =>
          request.url === rolesUrl &&
          request.params.get('page') === '1' &&
          request.params.get('itemsPerPage') === '100',
      );
      firstRequest.flush({ ...mockCollection([mockRole]), totalItems: 101 });

      const secondRequest = httpMock.expectOne(
        (request) => request.url === rolesUrl && request.params.get('page') === '2',
      );
      secondRequest.flush({ ...mockCollection([second]), totalItems: 101 });

      expect(result).toEqual([mockRole, second]);
    });

    it('should stop after a single page when the collection fits in it', () => {
      let result: readonly OrganizationRoleOutput[] = [];

      service.listAll(orgId).subscribe((roles) => {
        result = roles;
      });

      const req = httpMock.expectOne(
        (request) => request.url === rolesUrl && request.params.get('page') === '1',
      );
      req.flush(mockCollection([mockRole]));

      expect(result).toEqual([mockRole]);
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateOrganizationRoleInput = {
      name: 'Technician',
      description: 'Can perform inspections',
      permissions: ['inspection:read', 'inspection:write'],
    };

    it('should send POST request and return created role', () => {
      const createdRole: OrganizationRoleOutput = { ...mockRole, name: 'Technician' };

      service.create(orgId, input).subscribe((role) => {
        expect(role.name).toBe('Technician');
      });

      const req = httpMock.expectOne(rolesUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(createdRole);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const input: UpdateOrganizationRoleInput = {
      permissions: ['facility:read', 'equipment:read'],
    };

    it('should send PATCH request and return updated role', () => {
      const updatedRole: OrganizationRoleOutput = {
        ...mockRole,
        permissions: [
          { name: 'facility:read', description: 'Read facilities' },
          { name: 'equipment:read', description: 'Read equipment' },
        ],
      };

      service.update(orgId, 'role-uuid-1', input).subscribe((role) => {
        expect(role.permissions.map((permission) => permission.name)).toContain('facility:read');
      });

      const req = httpMock.expectOne(`${rolesUrl}/role-uuid-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(updatedRole);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should send DELETE request for the role', () => {
      service.remove(orgId, 'role-uuid-1').subscribe();

      const req = httpMock.expectOne(`${rolesUrl}/role-uuid-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });
  });

  // ── assignToMember ─────────────────────────────────────────────────────────

  describe('assignToMember', () => {
    const memberId = 'member-uuid-1';
    const input: AssignOrganizationRoleInput = {
      roleId: 'role-uuid-1',
    };

    it('should send POST request and return updated member', () => {
      const mockMember: OrganizationMemberOutput = {
        '@id': `/api/organizations/${orgId}/members/${memberId}`,
        '@type': 'OrganizationMember',
        id: memberId,
        organizationId: orgId,
        userId: 'user-uuid-2',
        displayName: 'Alex Martin',
        isActive: true,
        isOwner: false,
        joinedAt: '2026-01-15T10:00:00+00:00',
        roleIds: ['role-uuid-1'],
      };

      service.assignToMember(orgId, memberId, input).subscribe((member) => {
        expect(member.roleIds).toContain('role-uuid-1');
      });

      const req = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/organizations/${orgId}/members/${memberId}/roles`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockMember);
    });
  });

  // ── removeFromMember ───────────────────────────────────────────────────────

  describe('removeFromMember', () => {
    const memberId = 'member-uuid-1';

    it('should send DELETE request for the member role assignment', () => {
      service.removeFromMember(orgId, memberId, 'role-uuid-1').subscribe();

      const req = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/organizations/${orgId}/members/${memberId}/roles/role-uuid-1`,
      );
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });
  });
  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return the role with its member count', () => {
      service.get(orgId, 'role-uuid-1').subscribe((role) => {
        expect(role.id).toBe('role-uuid-1');
        expect(role.memberCount).toBe(4);
      });

      const req = httpMock.expectOne(`${rolesUrl}/role-uuid-1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ ...mockRole, memberCount: 4 });
    });

    it('should handle not found when the role belongs to another organization', () => {
      service.get(orgId, 'role-uuid-9').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${rolesUrl}/role-uuid-9`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── replaceMemberRoles ─────────────────────────────────────────────────────

  describe('replaceMemberRoles', () => {
    const memberId = 'member-uuid-1';
    const rolesUrlForMember = `${mockEnv.apiUrl}/api/organizations/${orgId}/members/${memberId}/roles`;
    const input: ReplaceOrganizationMemberRolesInput = {
      roleIds: ['role-uuid-1', 'role-uuid-2'],
    };
    const mockMember: OrganizationMemberOutput = {
      '@id': `/api/organizations/${orgId}/members/${memberId}`,
      '@type': 'OrganizationMember',
      id: memberId,
      organizationId: orgId,
      userId: 'user-uuid-2',
      displayName: 'Alex Martin',
      isActive: true,
      isOwner: false,
      joinedAt: '2026-01-15T10:00:00+00:00',
      roleIds: ['role-uuid-1', 'role-uuid-2'],
    };

    it('should send PUT request with the complete role set and return the updated member', () => {
      service.replaceMemberRoles(orgId, memberId, input).subscribe((member) => {
        expect(member.id).toBe(memberId);
      });

      const req = httpMock.expectOne(rolesUrlForMember);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockMember);
    });

    it('should send an empty array as a full revocation rather than skipping the call', () => {
      service.replaceMemberRoles(orgId, memberId, { roleIds: [] }).subscribe();

      const req = httpMock.expectOne(rolesUrlForMember);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ roleIds: [] });
      req.flush({ ...mockMember, roleIds: [] });
    });

    it('should surface the last-administrator conflict', () => {
      service.replaceMemberRoles(orgId, memberId, { roleIds: [] }).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(rolesUrlForMember);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
  });
});
