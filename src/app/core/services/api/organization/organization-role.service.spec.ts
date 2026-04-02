import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrganizationRoleService } from './organization-role.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  OrganizationRoleOutput,
  OrganizationMemberOutput,
  CreateOrganizationRoleInput,
  UpdateOrganizationRoleInput,
  AssignOrganizationRoleInput,
} from '@core/models/organization';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

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
    permissions: ['facility:read', 'facility:write'],
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
      const updatedRole: OrganizationRoleOutput = { ...mockRole, permissions: ['facility:read', 'equipment:read'] };

      service.update(orgId, 'role-uuid-1', input).subscribe((role) => {
        expect(role.permissions).toContain('facility:read');
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
        isActive: true,
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
});
