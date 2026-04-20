import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
  type OrganizationPermissionOutput,
  type OrganizationRoleOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { OrganizationMemberAccessStore } from '../organization-member-access.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

describe('OrganizationMemberAccessStore', () => {
  const selectedOrganization = signal<{ id: string } | null>(null);

  const role: OrganizationRoleOutput = {
    '@id': '/api/organizations/org-1/roles/owner',
    '@type': 'OrganizationRole',
    id: 'owner',
    organizationId: 'org-1',
    name: 'Owner',
    description: 'Organization owner',
    isSystem: true,
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ, ORGANIZATION_PERMISSION.FACILITIES_WRITE],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const permission: OrganizationPermissionOutput = {
    '@id': '/api/organizations/org-1/permissions/facilities-write',
    '@type': 'Permission',
    id: 'facilities-write',
    name: ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    description: 'Write facilities',
  };

  const profile: CurrentOrganizationMemberProfileOutput = {
    '@id': '/api/organizations/org-1/me',
    '@type': 'OrganizationMember',
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roles: [role],
    permissions: [permission],
  };

  let store: OrganizationMemberAccessStore;
  let mockOrganizationMemberService: {
    getCurrentProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    selectedOrganization.set(null);
    mockOrganizationMemberService = {
      getCurrentProfile: vi.fn().mockReturnValue(of(profile)),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization,
          },
        },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
      ],
    });

    store = TestBed.inject(OrganizationMemberAccessStore);
  });

  it('should load organization member access when the active organization changes', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledWith('org-1');
    expect(store.permissions()).toEqual([ORGANIZATION_PERMISSION.FACILITIES_WRITE]);
    expect(store.roles()).toEqual(['Owner']);
    expect(store.accessCallState().status).toBe('success');
  });

  it('should clear access when the active organization becomes null', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    selectedOrganization.set(null);
    await flushEffects();

    expect(store.profile()).toBeNull();
    expect(store.permissions()).toEqual([]);
    expect(store.accessCallState().status).toBe('idle');
  });

  it('should reload the current organization member access payload', async () => {
    const updatedProfile: CurrentOrganizationMemberProfileOutput = {
      ...profile,
      permissions: [
        permission,
        {
          ...permission,
          id: 'facilities-read',
          name: ORGANIZATION_PERMISSION.FACILITIES_READ,
        },
      ],
    };

    mockOrganizationMemberService.getCurrentProfile
      .mockReturnValueOnce(of(profile))
      .mockReturnValueOnce(of(updatedProfile));

    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    store.reload();
    await flushEffects();

    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(2);
    expect(store.permissions()).toEqual([
      ORGANIZATION_PERMISSION.FACILITIES_WRITE,
      ORGANIZATION_PERMISSION.FACILITIES_READ,
    ]);
  });

  it('should not request the same organization access twice while a load is pending', async () => {
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(of(profile));

    store.loadAccess('org-1');
    store.loadAccess('org-1');
    await flushEffects();

    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(1);
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledWith('org-1');
  });

  it('should expose an error state when access loading fails', async () => {
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(
      throwError(() => new Error('Forbidden')),
    );

    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    expect(store.accessCallState().status).toBe('error');
    expect(store.accessError()).not.toBeNull();
    expect(store.permissions()).toEqual([]);
  });
});
