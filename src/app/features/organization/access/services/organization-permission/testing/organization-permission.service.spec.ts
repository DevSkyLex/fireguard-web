import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { idleCallState, successCallState, type CallState, type StoreError } from '@core/state/request-state';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
  type OrganizationPermissionOutput,
} from '@features/organization/models';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { OrganizationPermissionService } from '../organization-permission.service';

describe('OrganizationPermissionService', () => {
  const currentOrganizationId = signal<string | null>(null);
  const accessCallState = signal<CallState<CurrentOrganizationMemberProfileOutput>>(idleCallState());
  const permissions = signal<ReadonlyArray<string>>([]);
  const roles = signal<ReadonlyArray<string>>([]);
  const isLoadingAccess = signal<boolean>(false);
  const accessError = signal<StoreError | null>(null);
  const profile = signal<null>(null);
  const reload = vi.fn();
  const clear = vi.fn();
  const mockPermission: OrganizationPermissionOutput = {
    '@id': '/api/organizations/org-1/permissions/facilities-write',
    '@type': 'Permission',
    id: 'facilities-write',
    name: ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    description: 'Write facilities',
  };
  const mockCurrentProfile: CurrentOrganizationMemberProfileOutput = {
    '@id': '/api/organizations/org-1/me',
    '@type': 'OrganizationMember',
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roles: [],
    permissions: [mockPermission],
  };

  let service: OrganizationPermissionService;

  beforeEach(() => {
    currentOrganizationId.set(null);
    accessCallState.set(idleCallState());
    permissions.set([]);
    roles.set([]);
    isLoadingAccess.set(false);
    accessError.set(null);
    profile.set(null);
    reload.mockReset();
    clear.mockReset();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OrganizationMemberAccessStore,
          useValue: {
            currentOrganizationId,
            accessCallState,
            profile,
            roles,
            permissions,
            isLoadingAccess,
            accessError,
            reload,
            clear,
          },
        },
      ],
    });

    service = TestBed.inject(OrganizationPermissionService);
  });

  it('should expose organization-scoped permissions', () => {
    permissions.set([ORGANIZATION_PERMISSION.FACILITIES_WRITE]);

    expect(service.permissions()).toEqual([ORGANIZATION_PERMISSION.FACILITIES_WRITE]);
    expect(service.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE)).toBe(true);
    expect(service.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ)).toBe(false);
  });

  it('should treat organization wildcard permissions as granting all organization permissions', () => {
    permissions.set([ORGANIZATION_PERMISSION.ALL]);

    expect(service.hasPermission(ORGANIZATION_PERMISSION.DASHBOARD_READ)).toBe(true);
    expect(service.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ)).toBe(true);
    expect(service.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE)).toBe(true);
  });

  it('should support any/all organization permission checks', () => {
    permissions.set([
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    ]);

    expect(
      service.hasAnyPermission([
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
        ORGANIZATION_PERMISSION.FACILITIES_WRITE,
      ]),
    ).toBe(true);
    expect(
      service.hasAllPermissions([
        ORGANIZATION_PERMISSION.FACILITIES_READ,
        ORGANIZATION_PERMISSION.FACILITIES_WRITE,
      ]),
    ).toBe(true);
    expect(
      service.hasAllPermissions([
        ORGANIZATION_PERMISSION.FACILITIES_READ,
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ]),
    ).toBe(false);
  });

  it('should proxy reload to the published organization access port', () => {
    service.reload();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('should reuse the current store permissions when access is already loaded for the target organization', async () => {
    currentOrganizationId.set('org-1');
    accessCallState.set(successCallState(mockCurrentProfile));
    permissions.set([ORGANIZATION_PERMISSION.FACILITIES_WRITE]);

    expect(service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE])).toBe(
      true,
    );
  });

  it('should deny access when the target organization access payload has not been preloaded', () => {
    expect(service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE])).toBe(
      false,
    );
  });

  it('should honor organization wildcard permissions for route access checks', () => {
    currentOrganizationId.set('org-1');
    permissions.set([ORGANIZATION_PERMISSION.ALL]);
    accessCallState.set(
      successCallState({
        ...mockCurrentProfile,
        organizationId: 'org-1',
        permissions: [
          {
            ...mockPermission,
            id: 'organization-all',
            name: ORGANIZATION_PERMISSION.ALL,
            description: 'All organization permissions',
          },
        ],
      }),
    );

    expect(service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.EQUIPMENT_WRITE])).toBe(
      true,
    );
  });

  it('should deny access while the target organization access payload is still pending', () => {
    currentOrganizationId.set('org-1');
    accessCallState.set({ status: 'pending', data: null, error: null });

    expect(service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE])).toBe(
      false,
    );
  });
});
