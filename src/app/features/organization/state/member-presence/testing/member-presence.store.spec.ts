import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService, type MercureConnectionStatus } from '@core/mercure';
import { PresenceService } from '@features/organization/data-access';
import type {
  ListPresenceQuery,
  PingPresenceOutput,
  PresenceOutput,
  PresenceStatus,
  PresenceSubscriptionOutput,
} from '@features/organization/models';
import { MemberPresenceStore } from '../member-presence.store';

/** Builds an API-confirmed member status without coupling tests to the entity store shape. */
function presence(memberId: string, status: PresenceStatus = 'active'): PresenceOutput {
  return {
    '@id': `/presence/${memberId}`,
    '@type': 'Presence',
    memberId,
    status,
    online: status !== 'offline',
    lastSeenAt: new Date().toISOString(),
  };
}

/** Returns the transport collection accepted by the mocked API service. */
function collection(member: readonly PresenceOutput[]): HydraCollection<PresenceOutput> {
  return { '@id': '/api/presence', '@type': 'Collection', member, totalItems: member.length };
}

/** Returns an acknowledged heartbeat for the signed-in member. */
function acknowledgment(): PingPresenceOutput {
  return {
    '@id': '/presence/me',
    '@type': 'Presence',
    memberId: 'me',
    lastSeenAt: new Date().toISOString(),
  };
}

/** Returns expiring credentials with a controllable token and lifetime. */
function credentials(token = 'first', lifetime = 120_000): PresenceSubscriptionOutput {
  return {
    '@id': '/presence/subscription',
    '@type': 'Subscription',
    topic: '/organizations/org-1/presence',
    token,
    expiresAt: new Date(Date.now() + lifetime).toISOString(),
  };
}

describe('MemberPresenceStore', () => {
  let api: {
    list: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    getSubscription: ReturnType<typeof vi.fn>;
  };
  let frames: Subject<unknown>;
  let mercure: {
    subscribe: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof signal<ReadonlyMap<string, MercureConnectionStatus>>>;
  };

  function setup(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: PresenceService, useValue: api },
        { provide: MercureService, useValue: mercure },
      ],
    });
    return TestBed.inject(MemberPresenceStore);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    frames = new Subject<unknown>();
    api = {
      list: vi.fn().mockReturnValue(of(collection([]))),
      ping: vi.fn().mockReturnValue(NEVER),
      getSubscription: vi.fn().mockReturnValue(NEVER),
    };
    mercure = {
      subscribe: vi.fn().mockReturnValue(frames),
      status: signal<ReadonlyMap<string, MercureConnectionStatus>>(new Map()),
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('lets a successful heartbeat supersede an older offline response and cancels the pre-heartbeat read', () => {
    const beforePing = new Subject<HydraCollection<PresenceOutput>>();
    const afterPing = new Subject<HydraCollection<PresenceOutput>>();
    const heartbeat = new Subject<PingPresenceOutput>();
    api.ping.mockReturnValue(heartbeat);
    api.list.mockReturnValueOnce(beforePing).mockReturnValue(afterPing);
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['me']);
    store.resume();
    beforePing.next(collection([presence('me', 'offline')]));
    beforePing.complete();
    expect(store.byId()['me']).toBe('offline');
    heartbeat.next(acknowledgment());
    heartbeat.complete();
    expect(store.ownStatus()).toBe('active');
    expect(store.byId()['me']).toBeUndefined();
    afterPing.next(collection([presence('me', 'do_not_disturb')]));
    afterPing.complete();
    expect(store.ownStatus()).toBe('do_not_disturb');
  });

  it('does not allow a late pre-heartbeat offline snapshot to undo acknowledgment', () => {
    const stale = new Subject<HydraCollection<PresenceOutput>>();
    const fresh = new Subject<HydraCollection<PresenceOutput>>();
    const heartbeat = new Subject<PingPresenceOutput>();
    api.ping.mockReturnValue(heartbeat);
    api.list.mockReturnValueOnce(stale).mockReturnValue(fresh);
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['me']);
    store.resume();
    heartbeat.next(acknowledgment());
    expect(stale.observed).toBe(false);
    stale.next(collection([presence('me', 'offline')]));
    stale.complete();
    expect(store.ownStatus()).toBe('active');
  });

  it.each([
    { organization: 'org-2', revision: 1 },
    { organization: 'org-1', revision: 2 },
  ])(
    'cancels pending reads, ping and credentials when context becomes %j',
    ({ organization, revision }) => {
      const read = new Subject<HydraCollection<PresenceOutput>>();
      const heartbeat = new Subject<PingPresenceOutput>();
      const subscription = new Subject<PresenceSubscriptionOutput>();
      api.list.mockReturnValue(read);
      api.ping.mockReturnValue(heartbeat);
      api.getSubscription.mockReturnValue(subscription);
      const store = setup();
      store.configure('org-1', 1, true);
      store.watch(['old']);
      store.resume();
      store.configure(organization, revision, true);
      expect(read.observed).toBe(false);
      expect(heartbeat.observed).toBe(false);
      expect(subscription.observed).toBe(false);
      read.next(collection([presence('old')]));
      heartbeat.next(acknowledgment());
      subscription.next(credentials());
      expect(store.byId()).toEqual({});
      expect(store.ownStatus()).toBeNull();
      expect(mercure.subscribe).not.toHaveBeenCalled();
    },
  );

  it('deduplicates and normalizes watched member IDs before splitting into batches of at most 100', () => {
    api.list.mockImplementation((query: ListPresenceQuery) =>
      of(collection(query.memberIds.map((id) => presence(id)))),
    );
    const store = setup();
    const ids = Array.from({ length: 205 }, (_, index) => `member-${index}`);
    store.configure('org-1', 1, true);
    store.watch([...ids, 'member-0', '/api/organization-members/member-1']);
    store.resume();
    const queries = api.list.mock.calls.map(([query]) => query as ListPresenceQuery);
    expect(queries.map((query) => query.memberIds.length)).toEqual([100, 100, 5]);
    expect(new Set(queries.flatMap((query) => query.memberIds)).size).toBe(205);
    expect(Object.keys(store.byId())).toHaveLength(205);
  });

  it('keeps unknown members absent and expires stale success after a failed reconciliation', () => {
    api.list
      .mockReturnValueOnce(of(collection([presence('known')])))
      .mockReturnValue(throwError(() => new Error('unavailable')));
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['known', 'unknown']);
    store.resume();
    expect(store.byId()).toEqual({ known: 'active' });
    store.refresh();
    expect(store.listCallState().status).toBe('error');
    expect(store.byId()['known']).toBe('active');
    vi.advanceTimersByTime(90_000);
    store.tick();
    expect(store.byId()).toEqual({});
  });

  it('cancels an obsolete tracked-set query and removes released members from presentation immediately', () => {
    const old = new Subject<HydraCollection<PresenceOutput>>();
    api.list.mockReturnValueOnce(old).mockReturnValue(of(collection([presence('new')])));
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['old']);
    store.resume();
    store.watch(['new']);
    expect(old.observed).toBe(false);
    old.next(collection([presence('old')]));
    old.complete();
    expect(store.byId()).toEqual({ new: 'active' });
    store.watch([]);
    expect(store.byId()).toEqual({});
  });

  it('retains GET-confirmed own availability during a 429 backoff and retries only after its deadline', () => {
    api.ping
      .mockReturnValueOnce(of(acknowledgment()))
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    api.list.mockReturnValue(of(collection([presence('me', 'do_not_disturb')])));
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['me']);
    store.resume();
    vi.advanceTimersByTime(60_000);
    store.ping();
    expect(store.pingCallState().status).toBe('error');
    vi.advanceTimersByTime(31_000);
    store.refresh();
    store.tick();
    expect(store.ownStatus()).toBe('do_not_disturb');
    store.ping();
    expect(api.ping).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(149_000);
    store.ping();
    expect(api.ping).toHaveBeenCalledTimes(3);
  });

  it('coalesces only watched-member events from this organization over 300 ms', () => {
    api.getSubscription.mockReturnValue(of(credentials()));
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['member']);
    store.resume();
    api.list.mockClear();
    frames.next({ type: 'presence.changed', organizationId: 'org-2', memberId: 'member' });
    frames.next({ type: 'presence.changed', organizationId: 'org-1', memberId: 'unwatched' });
    frames.next(null);
    vi.advanceTimersByTime(300);
    expect(api.list).not.toHaveBeenCalled();
    frames.next({ type: 'presence.changed', organizationId: 'org-1', memberId: 'member' });
    vi.advanceTimersByTime(200);
    frames.next({ type: 'presence.changed', organizationId: 'org-1', memberId: 'member' });
    vi.advanceTimersByTime(299);
    expect(api.list).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(api.list).toHaveBeenCalledOnce();
  });

  it('renews expiring credentials, retains the old stream on failure, and retries after 45 seconds', () => {
    const released = vi.fn();
    mercure.subscribe.mockReturnValue(new Observable<unknown>(() => released));
    api.getSubscription
      .mockReturnValueOnce(of(credentials()))
      .mockReturnValueOnce(throwError(() => new Error('unavailable')))
      .mockImplementation(() => of(credentials('renewed')));
    const store = setup();
    store.configure('org-1', 1, true);
    store.resume();
    vi.advanceTimersByTime(60_000);
    expect(api.getSubscription).toHaveBeenCalledTimes(2);
    expect(released).not.toHaveBeenCalled();
    expect(store.subscriptionCallState().status).toBe('error');
    vi.advanceTimersByTime(45_000);
    expect(mercure.subscribe).toHaveBeenLastCalledWith('/organizations/org-1/presence', 'renewed');
    expect(released).toHaveBeenCalledOnce();
    store.pause();
    expect(released).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(120_000);
    expect(api.getSubscription).toHaveBeenCalledTimes(3);
  });

  it('reconciles on reconnect, without refetching for an unchanged connection status', () => {
    api.getSubscription.mockReturnValue(of(credentials()));
    const store = setup();
    store.configure('org-1', 1, true);
    store.watch(['member']);
    store.resume();
    TestBed.tick();
    api.list.mockClear();
    const topic = '/organizations/org-1/presence';
    mercure.status.set(new Map([[topic, 'connected']]));
    TestBed.tick();
    expect(api.list).toHaveBeenCalledOnce();
    mercure.status.set(new Map([[topic, 'connected']]));
    TestBed.tick();
    expect(api.list).toHaveBeenCalledOnce();
    mercure.status.set(new Map([[topic, 'reconnecting']]));
    TestBed.tick();
    mercure.status.set(new Map([[topic, 'connected']]));
    TestBed.tick();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('keeps all transport and streams inert during SSR', () => {
    const store = setup('server');
    store.configure('org-1', 1, true);
    store.watch(['member']);
    store.resume();
    store.ping();
    store.refresh();
    expect(api.ping).not.toHaveBeenCalled();
    expect(api.list).not.toHaveBeenCalled();
    expect(api.getSubscription).not.toHaveBeenCalled();
    expect(store.byId()).toEqual({});
  });

  it('allows heartbeat without granting roster reads or a presence subscription', () => {
    const store = setup();
    store.configure('org-1', 1, false);
    store.watch(['member']);
    store.resume();
    expect(api.ping).toHaveBeenCalledWith({ organization: 'org-1' });
    expect(api.list).not.toHaveBeenCalled();
    expect(api.getSubscription).not.toHaveBeenCalled();
  });

  it('masks own presence on a local pause without claiming that other devices are offline', () => {
    api.ping.mockReturnValue(of(acknowledgment()));
    const store = setup();
    store.configure('org-1', 1, false);
    store.resume();
    expect(store.ownStatus()).toBe('active');
    store.pause();
    expect(store.ownStatus()).toBeNull();
    expect(store.byId()).toEqual({});
  });
});
