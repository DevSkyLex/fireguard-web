import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { MercureService } from '@core/mercure';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { PresenceService } from '@features/organization/data-access';
import type {
  CurrentOrganizationMemberProfileOutput,
  ListPresenceQuery,
} from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { MemberPresenceStore } from '@features/organization/state/member-presence';
import { MemberPresenceCoordinatorService } from '../member-presence-coordinator.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class PresenceTestHost {
  public readonly coordinator = inject(MemberPresenceCoordinatorService);
}

/** Builds verified membership separately from the selected organization. */
function membership(
  organizationId = 'org-1',
  isActive = true,
): CurrentOrganizationMemberProfileOutput {
  return {
    '@id': '/api/organization-members/me',
    '@type': 'Member',
    id: 'me',
    userId: 'user',
    organizationId,
    isActive,
    joinedAt: '2026-01-01',
    roles: [],
    permissions: [],
  };
}

/** Flushes initial rendering and the reactive lifecycle enabled by its after-render callback. */
function flush(): void {
  TestBed.tick();
  TestBed.tick();
}

describe('MemberPresenceCoordinatorService', () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    getSubscription: ReturnType<typeof vi.fn>;
  };
  let selectedOrganizationId: WritableSignal<string | null>;
  let profile: WritableSignal<CurrentOrganizationMemberProfileOutput | null>;
  let isAuthenticated: WritableSignal<boolean>;
  let sessionRevision: WritableSignal<number>;
  let online: WritableSignal<boolean>;
  let canRead: WritableSignal<boolean>;
  let visibility: DocumentVisibilityState;
  let fixture: ComponentFixture<PresenceTestHost>;

  function setup(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: PresenceService, useValue: api },
        {
          provide: MercureService,
          useValue: { subscribe: vi.fn().mockReturnValue(NEVER), status: signal(new Map()) },
        },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId } },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { profile } },
        { provide: OrganizationPermissionService, useValue: { hasAnyPermission: () => canRead() } },
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
        { provide: ConnectivityService, useValue: { online } },
      ],
    });
    const coordinator = TestBed.inject(MemberPresenceCoordinatorService);
    const store = TestBed.inject(MemberPresenceStore);
    fixture = TestBed.createComponent(PresenceTestHost);
    return { coordinator, store };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    selectedOrganizationId = signal<string | null>('org-1');
    profile = signal<CurrentOrganizationMemberProfileOutput | null>(membership());
    isAuthenticated = signal(true);
    sessionRevision = signal(1);
    online = signal(true);
    canRead = signal(true);
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    api = {
      ping: vi.fn().mockReturnValue(NEVER),
      getSubscription: vi.fn().mockReturnValue(NEVER),
      list: vi.fn().mockImplementation((query: ListPresenceQuery) =>
        of({
          '@id': '/api/presence',
          '@type': 'Collection',
          totalItems: query.memberIds.length,
          member: query.memberIds.map((memberId) => ({
            '@id': `/presence/${memberId}`,
            '@type': 'Presence',
            memberId,
            status: 'active',
            online: true,
          })),
        }),
      ),
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('preserves registrations made before the first lifecycle flush and unions simultaneous consumers', () => {
    const { coordinator, store } = setup();
    const roster = {};
    const conversation = {};
    coordinator.register(roster, ['one', 'two']);
    coordinator.register(conversation, ['two', 'three']);
    expect(api.ping).not.toHaveBeenCalled();
    flush();
    expect(store.watched()).toEqual(['one', 'three', 'two']);
    expect(coordinator.byId()).toEqual({ one: 'active', two: 'active', three: 'active' });
    coordinator.unregister(roster);
    flush();
    expect(store.watched()).toEqual(['three', 'two']);
    coordinator.unregister(conversation);
    flush();
    expect(coordinator.byId()).toEqual({});
  });

  it('replaces only one registration while retaining other consumers and avoids identical refreshes', () => {
    const { coordinator, store } = setup();
    const first = {};
    const second = {};
    coordinator.register(first, ['first']);
    coordinator.register(second, ['second']);
    flush();
    api.list.mockClear();
    coordinator.register(first, ['first']);
    flush();
    expect(api.list).not.toHaveBeenCalled();
    coordinator.register(first, ['replacement']);
    flush();
    expect(store.watched()).toEqual(['replacement', 'second']);
  });

  it('does not reuse old-organization registrations while selected membership is unverified', () => {
    const { coordinator, store } = setup();
    coordinator.register({}, ['old-member']);
    flush();
    api.list.mockClear();
    selectedOrganizationId.set('org-2');
    flush();
    expect(store.organizationId()).toBeNull();
    expect(coordinator.byId()).toEqual({});
    expect(api.list).not.toHaveBeenCalled();
    profile.set(membership('org-2'));
    flush();
    expect(store.organizationId()).toBe('org-2');
    expect(store.watched()).toEqual([]);
    coordinator.register({}, ['new-member']);
    flush();
    expect(api.list).toHaveBeenLastCalledWith({ organization: 'org-2', memberIds: ['new-member'] });
  });

  it('purges all registrations on account revision changes', () => {
    const { coordinator, store } = setup();
    coordinator.register({}, ['departed-account-member']);
    flush();
    isAuthenticated.set(false);
    sessionRevision.set(2);
    flush();
    expect(store.organizationId()).toBeNull();
    expect(store.watched()).toEqual([]);
    expect(coordinator.byId()).toEqual({});
    isAuthenticated.set(true);
    flush();
    expect(store.watched()).toEqual([]);
  });

  it('retains registered members when read permission changes before heartbeat acknowledgment', () => {
    const { coordinator, store } = setup();
    coordinator.register({}, ['member']);
    flush();
    expect(store.watched()).toEqual(['member']);
    canRead.set(false);
    flush();
    expect(coordinator.byId()).toEqual({});
    canRead.set(true);
    flush();
    expect(store.watched()).toEqual(['member']);
    expect(coordinator.byId()).toEqual({ member: 'active' });
  });

  it('never queries departed-account registrations during an authenticated session replacement', () => {
    const { coordinator, store } = setup();
    coordinator.register({}, ['private-old-account-member']);
    flush();
    api.list.mockClear();
    sessionRevision.set(2);
    flush();
    expect(store.watched()).toEqual([]);
    expect(api.list).not.toHaveBeenCalled();
    expect(coordinator.byId()).toEqual({});
  });

  it('pauses on tab hiding and connectivity loss, then immediately resumes and reconciles', () => {
    const { coordinator, store } = setup();
    coordinator.register({}, ['member']);
    flush();
    expect(store.running()).toBe(true);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    flush();
    expect(store.running()).toBe(false);
    expect(coordinator.byId()).toEqual({});
    api.list.mockClear();
    api.ping.mockClear();
    vi.advanceTimersByTime(120_000);
    expect(api.list).not.toHaveBeenCalled();
    expect(api.ping).not.toHaveBeenCalled();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    flush();
    expect(store.running()).toBe(true);
    expect(api.ping).toHaveBeenCalledOnce();
    expect(coordinator.byId()).toEqual({ member: 'active' });
    online.set(false);
    flush();
    expect(store.running()).toBe(false);
    api.ping.mockClear();
    online.set(true);
    flush();
    expect(api.ping).toHaveBeenCalledOnce();
  });

  it('uses one heartbeat and reconciliation schedule regardless of registration count', () => {
    api.ping.mockReturnValue(
      of({
        '@id': '/presence/me',
        '@type': 'Presence',
        memberId: 'me',
        lastSeenAt: new Date().toISOString(),
      }),
    );
    const { coordinator } = setup();
    coordinator.register({}, ['first']);
    coordinator.register({}, ['second']);
    flush();
    api.ping.mockClear();
    api.list.mockClear();
    vi.advanceTimersByTime(45_000);
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(15_000);
    expect(api.ping).toHaveBeenCalledOnce();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('refuses to announce an inactive membership or an unauthenticated remembered organization', () => {
    profile.set(membership('org-1', false));
    const { store } = setup();
    flush();
    expect(store.running()).toBe(false);
    expect(api.ping).not.toHaveBeenCalled();
    isAuthenticated.set(false);
    profile.set(membership());
    flush();
    expect(api.ping).not.toHaveBeenCalled();
  });

  it('does not start browser work during SSR', () => {
    const { coordinator, store } = setup('server');
    coordinator.register({}, ['member']);
    flush();
    vi.advanceTimersByTime(120_000);
    expect(store.running()).toBe(false);
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
    expect(api.getSubscription).not.toHaveBeenCalled();
  });

  it('releases timers and the visibility listener when its injector is destroyed', () => {
    const { coordinator } = setup();
    coordinator.register({}, ['member']);
    flush();
    fixture.destroy();
    TestBed.resetTestingModule();
    api.list.mockClear();
    api.ping.mockClear();
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(120_000);
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
  });
});
