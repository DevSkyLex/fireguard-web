import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject } from 'rxjs';
import { idleCallState, successCallState, type CallState, type StoreError } from '@core/state/request-state';
import { OrganizationMemberService } from '@features/organization/data-access';
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
  let mockOrganizationMemberService: {
    getCurrentProfile: ReturnType<typeof vi.fn>;
  };

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
    mockOrganizationMemberService = {
      getCurrentProfile: vi.fn().mockReturnValue(of(mockCurrentProfile)),
    };

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
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
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

    await expect(
      firstValueFrom(
        service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE]),
      ),
    ).resolves.toBe(true);
    expect(mockOrganizationMemberService.getCurrentProfile).not.toHaveBeenCalled();
  });

  it('should fetch the current member profile when access is not loaded for the target organization', async () => {
    await expect(
      firstValueFrom(
        service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE]),
      ),
    ).resolves.toBe(true);
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledWith('org-1');
  });

  it('should share a single in-flight current profile request for concurrent checks', async () => {
    const profileSubject = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(profileSubject.asObservable());

    const firstCheck = firstValueFrom(
      service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE]),
    );
    const secondCheck = firstValueFrom(
      service.canAccessOrganization('org-1', [ORGANIZATION_PERMISSION.FACILITIES_WRITE]),
    );

    profileSubject.next(mockCurrentProfile);
    profileSubject.complete();

    await expect(firstCheck).resolves.toBe(true);
    await expect(secondCheck).resolves.toBe(true);
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(1);
  });
});
