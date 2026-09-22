import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
  type OrganizationPermissionOutput,
  type OrganizationRoleOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { myOrganizationsStoreEvents } from '../../my-organizations/events';
import { organizationSettingsStoreEvents } from '../../organization-settings/events';
import { OrganizationMemberAccessStore } from '../organization-member-access.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

describe('OrganizationMemberAccessStore', () => {
  const isAuthenticated = signal(true);
  const sessionRevision = signal(0);
  const selectedOrganization = signal<{ id: string } | null>(null);
  const selectedOrganizationId = computed<string | null>(() => selectedOrganization()?.id ?? null);

  const role: OrganizationRoleOutput = {
    '@id': '/api/organizations/org-1/roles/owner',
    '@type': 'OrganizationRole',
    id: 'owner',
    organizationId: 'org-1',
    name: 'Owner',
    description: 'Organization owner',
    isSystem: true,
    permissions: [
      { name: ORGANIZATION_PERMISSION.FACILITIES_READ, description: 'Read facilities' },
      { name: ORGANIZATION_PERMISSION.FACILITIES_WRITE, description: 'Write facilities' },
    ],
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
  let routerEvents: Subject<NavigationEnd>;
  let mockRouter: {
    events: Subject<NavigationEnd>;
    routerState: {
      snapshot: {
        root: {
          paramMap: { has: ReturnType<typeof vi.fn> };
          children: [];
        };
      };
    };
  };

  beforeEach(() => {
    isAuthenticated.set(true);
    sessionRevision.set(0);
    selectedOrganization.set(null);
    routerEvents = new Subject<NavigationEnd>();
    mockRouter = {
      events: routerEvents,
      routerState: {
        snapshot: {
          root: {
            paramMap: { has: vi.fn().mockReturnValue(false) },
            children: [],
          },
        },
      },
    };
    mockOrganizationMemberService = {
      getCurrentProfile: vi.fn().mockReturnValue(of(profile)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization,
            selectedOrganizationId,
          },
        },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
      ],
    });

    store = TestBed.inject(OrganizationMemberAccessStore);
  });

  it('does not load a remembered organization before authentication finishes', async () => {
    isAuthenticated.set(false);
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    store.loadAccess('org-1');
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(false);
    expect(mockOrganizationMemberService.getCurrentProfile).not.toHaveBeenCalled();

    isAuthenticated.set(true);
    sessionRevision.set(0);
    await flushEffects();
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledOnce();
  });

  it('cancels a pending access query when the authenticated session ends', async () => {
    const response = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(response);
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();
    expect(response.observed).toBe(true);

    isAuthenticated.set(false);
    await flushEffects();
    expect(response.observed).toBe(false);
    response.next(profile);
    expect(store.profile()).toBeNull();
    expect(store.permissions()).toEqual([]);
  });

  it('settles a pending guard without retaining permissions after logout', async () => {
    const response = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(response);
    const resolution = firstValueFrom(store.ensureAccessResolved('org-1'));
    isAuthenticated.set(false);
    await flushEffects();

    await expect(resolution).resolves.toBe(false);
    expect(response.observed).toBe(false);
    expect(store.profile()).toBeNull();
  });

  it('should load organization member access when the active organization changes', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledWith('org-1');
    expect(store.permissions()).toEqual([ORGANIZATION_PERMISSION.FACILITIES_WRITE]);
    expect(store.roles()).toEqual(['Owner']);
    expect(store.accessCallState().status).toBe('success');
  });

  it('should clear access once the URL leaves the organization scope', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    selectedOrganization.set(null);
    await flushEffects();

    expect(store.profile()).toBeNull();
    expect(store.permissions()).toEqual([]);
    expect(store.accessCallState().status).toBe('idle');
  });

  it('should keep an access load started before the URL is known', async () => {
    // `organizationAccessGuard` resolves access while the navigation is still
    // in flight, so the routed identifier is not published yet. That `null` is
    // "not known yet", not "left the scope" — clearing here would throw away
    // the very request the guard is waiting on.
    store.loadAccess('org-1');
    await flushEffects();

    expect(store.currentOrganizationId()).toBe('org-1');
    expect(store.accessCallState().status).toBe('success');
  });

  it('should resolve direct navigation access before the active organization resolver completes', async () => {
    const profileSubject = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(profileSubject.asObservable());

    const accessResolved = firstValueFrom(store.ensureAccessResolved('org-1'));
    await flushEffects();

    expect(store.currentOrganizationId()).toBe('org-1');
    expect(store.accessCallState().status).toBe('pending');

    profileSubject.next(profile);
    profileSubject.complete();

    await expect(accessResolved).resolves.toBe(true);
    expect(store.currentOrganizationId()).toBe('org-1');
    expect(store.accessCallState().status).toBe('success');
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

  it('should resolve ensured access successfully for an already loaded organization', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();

    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(true);
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(1);
  });

  it('should load and resolve access when ensuring a new organization', async () => {
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(true);

    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledWith('org-1');
  });

  it('should reuse the same pending request when ensuring access twice for the same organization', async () => {
    const profileSubject = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(profileSubject.asObservable());

    const firstEnsure = firstValueFrom(store.ensureAccessResolved('org-1'));
    const secondEnsure = firstValueFrom(store.ensureAccessResolved('org-1'));

    profileSubject.next(profile);
    profileSubject.complete();

    await expect(firstEnsure).resolves.toBe(true);
    await expect(secondEnsure).resolves.toBe(true);
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(1);
  });

  it('should resolve ensured access to false when loading fails', async () => {
    mockOrganizationMemberService.getCurrentProfile.mockReset();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(
      throwError(() => new Error('Forbidden')),
    );

    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(false);
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
  it('drops a pending guard profile after departure and ignores its late response', async () => {
    const pending = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(pending);
    const result = firstValueFrom(store.ensureAccessResolved('org-1'));
    TestBed.inject(Dispatcher).dispatch(
      myOrganizationsStoreEvents.leaveSucceeded({ organizationId: 'org-1' }),
    );
    pending.next(profile);
    await expect(result).resolves.toBe(false);
    expect(store.profile()).toBeNull();
    expect(store.permissions()).toEqual([]);
  });

  it('refreshes permissions after a confirmed ownership or status update', async () => {
    selectedOrganization.set({ id: 'org-1' });
    await flushEffects();
    expect(store.permissions()).not.toEqual([]);
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(
      of({ ...profile, permissions: [] }),
    );
    TestBed.inject(Dispatcher).dispatch(
      organizationSettingsStoreEvents.organizationUpdated({ id: 'org-1' } as never),
    );
    expect(store.permissions()).toEqual([]);
  });
  it('shares one read between an imperative load and guard resolution', async () => {
    const response = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(response);
    store.loadAccess('org-1');
    const resolution = firstValueFrom(store.ensureAccessResolved('org-1'));
    store.loadAccess('org-1');
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledOnce();
    response.next(profile);
    await expect(resolution).resolves.toBe(true);
  });

  it('settles replaced guards and ignores old permissions across A to B to A', async () => {
    const firstA = new Subject<CurrentOrganizationMemberProfileOutput>();
    const requestB = new Subject<CurrentOrganizationMemberProfileOutput>();
    const secondA = new Subject<CurrentOrganizationMemberProfileOutput>();
    mockOrganizationMemberService.getCurrentProfile
      .mockReturnValueOnce(firstA)
      .mockReturnValueOnce(requestB)
      .mockReturnValueOnce(secondA);
    const guardA = firstValueFrom(store.ensureAccessResolved('org-1'));
    const guardB = firstValueFrom(store.ensureAccessResolved('org-2'));
    const guardAgain = firstValueFrom(store.ensureAccessResolved('org-1'));
    await expect(guardA).resolves.toBe(false);
    await expect(guardB).resolves.toBe(false);
    expect(firstA.observed).toBe(false);
    expect(requestB.observed).toBe(false);
    firstA.next(profile);
    requestB.next({ ...profile, organizationId: 'org-2' });
    expect(store.permissions()).toEqual([]);
    secondA.next({ ...profile, permissions: [] });
    await expect(guardAgain).resolves.toBe(true);
    expect(store.currentOrganizationId()).toBe('org-1');
    expect(store.permissions()).toEqual([]);
  });

  it('invalidates a successful access cache for a new session before effects run', async () => {
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(true);
    sessionRevision.update((revision) => revision + 1);
    mockOrganizationMemberService.getCurrentProfile.mockReturnValue(
      of({ ...profile, permissions: [] }),
    );
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(true);
    await flushEffects();
    expect(mockOrganizationMemberService.getCurrentProfile).toHaveBeenCalledTimes(2);
    expect(store.accessCallState().status).toBe('success');
    expect(store.permissions()).toEqual([]);
  });

  it('retries an access refusal without retaining a completed pending reference', async () => {
    mockOrganizationMemberService.getCurrentProfile.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    );
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(false);
    await expect(firstValueFrom(store.ensureAccessResolved('org-1'))).resolves.toBe(true);
    expect(store.accessCallState().status).toBe('success');
  });
});
