import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { MessagingOutboxRepository } from '@features/organization/features/collaboration/data-access';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { MessagingSyncService, type MessagingReplayResult } from '../../messaging-sync';
import { MessagingSyncCoordinatorService } from '../messaging-sync-coordinator.service';

describe('MessagingSyncCoordinatorService', () => {
  let online: WritableSignal<boolean>;
  let pendingCount: WritableSignal<number>;
  let replay: ReturnType<typeof vi.fn>;
  let refresh: ReturnType<typeof vi.fn>;
  let revision: WritableSignal<number>;
  let authenticated: WritableSignal<boolean>;
  let profile: WritableSignal<ShellUserProfile | null>;
  let organizationId: WritableSignal<string | null>;

  function build(): MessagingSyncCoordinatorService {
    TestBed.configureTestingModule({
      providers: [
        MessagingSyncCoordinatorService,
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: revision, isAuthenticated: authenticated },
        },
        { provide: USER_IDENTITY_PORT, useValue: { profile } },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId },
        },
        { provide: ConnectivityService, useValue: { online } },
        { provide: MessagingSyncService, useValue: { replay } },
        {
          provide: MessagingOutboxRepository,
          useValue: {
            pendingCount,
            failedCount: signal(0),
            refresh,
          },
        },
      ],
    });

    return TestBed.inject(MessagingSyncCoordinatorService);
  }

  beforeEach(() => {
    revision = signal(1);
    authenticated = signal(true);
    profile = signal<ShellUserProfile | null>({ id: 'account-a' });
    organizationId = signal<string | null>('org-1');
    online = signal(true);
    pendingCount = signal(0);
    refresh = vi.fn().mockResolvedValue(undefined);
    replay = vi
      .fn()
      .mockResolvedValue({ replayed: 0, deferred: 0, failed: 0 } satisfies MessagingReplayResult);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should flush automatically once online with pending work', async () => {
    pendingCount.set(2);
    const coordinator = build();

    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();
    await vi.waitFor(() => expect(replay).toHaveBeenCalled());

    expect(coordinator.syncing()).toBe(false);
  });

  it('waits for session establishment before automatic replay', async () => {
    pendingCount.set(2);
    authenticated.set(false);
    const coordinator = build();
    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();
    expect(replay).not.toHaveBeenCalled();

    authenticated.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(replay).toHaveBeenCalledTimes(1));
  });

  it('restores durable queue counters when the authenticated owner arrives after startup', async () => {
    const persistedRows = [{ id: 'saved-message' }];
    authenticated.set(false);
    profile.set(null);
    refresh.mockImplementation(async () => {
      if (!authenticated() || !(profile()?.id ?? profile()?.sub))
        throw new DOMException('Offline operation ownership changed.', 'AbortError');
      pendingCount.set(persistedRows.length);
    });
    const coordinator = build();
    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();
    expect(pendingCount()).toBe(0);
    expect(refresh).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();

    authenticated.set(true);
    TestBed.tick();
    expect(refresh).not.toHaveBeenCalled();

    profile.set({ name: 'Profile awaiting its identifier' });
    TestBed.tick();
    expect(refresh).not.toHaveBeenCalled();

    profile.set({ sub: 'account-a' });
    TestBed.tick();
    await vi.waitFor(() => expect(replay).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(pendingCount()).toBe(1);
  });

  it('refreshes owner-bound counters after session replacement without following count changes', async () => {
    online.set(false);
    const coordinator = build();
    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();
    expect(refresh).toHaveBeenCalledTimes(1);

    revision.set(2);
    TestBed.tick();
    expect(refresh).toHaveBeenCalledTimes(2);

    profile.set({ id: 'account-b' });
    TestBed.tick();
    expect(refresh).toHaveBeenCalledTimes(3);

    pendingCount.set(2);
    TestBed.tick();
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(replay).not.toHaveBeenCalled();

    online.set(true);
    TestBed.tick();
    await vi.waitFor(() => expect(replay).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it.each(['session', 'organization'])(
    'does not execute an obsolete retry after the %s changes',
    async (change) => {
      replay.mockResolvedValueOnce({
        replayed: 0,
        deferred: 1,
        failed: 0,
      } satisfies MessagingReplayResult);
      await build().flush();
      if (change === 'session') revision.set(2);
      else organizationId.set('org-2');
      await vi.advanceTimersByTimeAsync(60_000);
      expect(replay).toHaveBeenCalledTimes(1);
    },
  );

  it('does not schedule a retry from a replay completion belonging to an old session', async () => {
    let resolveReplay!: (result: MessagingReplayResult) => void;
    replay.mockReturnValueOnce(
      new Promise<MessagingReplayResult>((resolve) => {
        resolveReplay = resolve;
      }),
    );
    const coordinator = build();
    const pass = coordinator.flush();
    revision.set(2);
    resolveReplay({ replayed: 0, deferred: 1, failed: 0 });
    await pass;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(coordinator.syncing()).toBe(false);
  });

  it('should not flush when offline even with pending work', () => {
    online.set(false);
    pendingCount.set(2);
    const coordinator = build();

    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();

    expect(replay).not.toHaveBeenCalled();
  });

  it('should not flush when there is no pending work', () => {
    pendingCount.set(0);
    const coordinator = build();

    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();

    expect(replay).not.toHaveBeenCalled();
  });

  it('should be idempotent: calling start twice only wires the effect once', () => {
    pendingCount.set(1);
    const coordinator = build();

    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.runInInjectionContext(() => coordinator.start());
    TestBed.tick();

    expect(replay).toHaveBeenCalledTimes(1);
  });

  it('should schedule a capped, jittered retry when a pass leaves work behind', async () => {
    replay.mockResolvedValue({
      replayed: 0,
      deferred: 1,
      failed: 0,
    } satisfies MessagingReplayResult);
    const coordinator = build();

    await coordinator.flush();
    expect(replay).toHaveBeenCalledTimes(1);

    // Jittered retry: fires somewhere within the base delay window.
    await vi.advanceTimersByTimeAsync(2_000);

    expect(replay.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should not retry when the replay pass clears the queue', async () => {
    replay.mockResolvedValue({
      replayed: 1,
      deferred: 0,
      failed: 0,
    } satisfies MessagingReplayResult);
    const coordinator = build();

    await coordinator.flush();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(replay).toHaveBeenCalledTimes(1);
  });

  it('should treat a thrown replay as deferred work and retry', async () => {
    replay.mockRejectedValueOnce(new Error('network down'));
    replay.mockResolvedValue({
      replayed: 0,
      deferred: 0,
      failed: 0,
    } satisfies MessagingReplayResult);
    const coordinator = build();

    await coordinator.flush();
    expect(coordinator.syncing()).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);

    expect(replay.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should not retry a scheduled retry while offline when it fires', async () => {
    replay.mockResolvedValue({
      replayed: 0,
      deferred: 1,
      failed: 0,
    } satisfies MessagingReplayResult);
    const coordinator = build();

    await coordinator.flush();
    online.set(false);
    await vi.advanceTimersByTimeAsync(60_000);

    // The timer fired but connectivity was down, so no second replay call.
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it('should ignore a concurrent flush call while one is already running', async () => {
    let resolveReplay!: (value: MessagingReplayResult) => void;
    replay.mockReturnValue(
      new Promise<MessagingReplayResult>((resolve) => {
        resolveReplay = resolve;
      }),
    );
    const coordinator = build();

    const first = coordinator.flush();
    const second = coordinator.flush();
    expect(coordinator.syncing()).toBe(true);

    resolveReplay({ replayed: 0, deferred: 0, failed: 0 });
    await Promise.all([first, second]);

    expect(replay).toHaveBeenCalledTimes(1);
  });

  it('should expose pending and failed counts from the outbox repository', () => {
    pendingCount.set(3);
    const coordinator = build();

    expect(coordinator.pendingCount()).toBe(3);
    expect(coordinator.failedCount()).toBe(0);
  });
});
