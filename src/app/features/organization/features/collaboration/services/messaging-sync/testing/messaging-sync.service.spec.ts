import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { USER_IDENTITY_PORT, type ShellUserProfile } from '@features/account/ports';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import {
  MessageService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import type { MessagingOutboxOperation } from '@features/organization/features/collaboration/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { MessagingSyncCoordinatorService } from '../../messaging-sync-coordinator';
import { MessagingSyncService } from '../messaging-sync.service';

/** An ApiError of a given status, the shape `HydraApiService` propagates. */
function apiError(status: number, detail = 'Refused.') {
  return { '@id': '', '@type': 'Error', status, type: 'about:blank', title: '', detail };
}

function operation(
  id: string,
  conversationId: string,
  body: string,
  status?: 'pending' | 'failed',
): MessagingOutboxOperation {
  return {
    id,
    idempotencyKey: crypto.randomUUID(),
    conversationId,
    type: 'message.send',
    payload: { conversationId, clientId: `client-${id}`, input: { body } },
    createdAt: `2026-01-01T00:00:0${id}.000Z`,
    status,
    error: null,
  };
}

describe('MessagingSyncService', () => {
  let outbox: {
    ensureIdempotencyKey: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
    pendingCount: WritableSignal<number>;
    failedCount: WritableSignal<number>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let messages: {
    postMessageWithClientId: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let revision: WritableSignal<number>;
  let authenticated: WritableSignal<boolean>;
  let profile: WritableSignal<ShellUserProfile | null>;
  let organizationId: WritableSignal<string | null>;
  let sessionEnded: Subject<void>;

  function build(): MessagingSyncService {
    TestBed.configureTestingModule({
      providers: [
        MessagingSyncService,
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
        { provide: ConnectivityService, useValue: { online: signal(true) } },
        { provide: MessagingOutboxRepository, useValue: outbox },
        { provide: MessageService, useValue: messages },
        { provide: Dispatcher, useValue: dispatcher },
        { provide: Events, useValue: { on: vi.fn(() => sessionEnded) } },
      ],
    });

    return TestBed.inject(MessagingSyncService);
  }

  beforeEach(() => {
    sessionEnded = new Subject<void>();
    revision = signal(1);
    authenticated = signal(true);
    profile = signal<ShellUserProfile | null>({ id: 'account-a' });
    organizationId = signal<string | null>('org-1');
    outbox = {
      ensureIdempotencyKey: vi.fn().mockResolvedValue(crypto.randomUUID()),
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      pendingCount: signal(2),
      failedCount: signal(0),
      refresh: vi.fn().mockResolvedValue(undefined),
    };
    messages = {
      postMessageWithClientId: vi.fn().mockReturnValue(of({ id: 'm1' })),
      list: vi.fn(),
    };
    dispatcher = { dispatch: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should replay a queued send and dequeue it', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);

    const result = await build().replay();

    expect(messages.postMessageWithClientId).toHaveBeenCalledWith(
      'c1',
      'client-1',
      {
        body: 'Bien reçu.',
      },
      { idempotencyKey: expect.any(String) },
    );
    expect(outbox.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ replayed: 1, deferred: 0, failed: 0 });
  });

  it.each([
    'idempotency_conflict',
    'idempotency_replay_expired',
    'idempotency_outcome_unknown',
    'idempotency_result_unavailable',
    'idempotency_owner_lost',
  ])('keeps the original row and key for review after %s', async (code) => {
    const queued = operation('1', 'c1', 'Saved intention');
    outbox.list.mockResolvedValue([queued]);
    messages.postMessageWithClientId.mockReturnValue(
      throwError(() => ({ ...apiError(409), code })),
    );
    const result = await build().replay();
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(outbox.markFailed).toHaveBeenCalledWith(queued.id, expect.any(String));
    expect(messages.postMessageWithClientId).toHaveBeenCalledWith(
      'c1',
      queued.payload.clientId,
      queued.payload.input,
      { idempotencyKey: queued.idempotencyKey },
    );
    expect(result.failed).toBe(1);
  });

  it('defers an in-progress receipt with its original key', async () => {
    const queued = operation('1', 'c1', 'Saved intention');
    outbox.list.mockResolvedValue([queued]);
    messages.postMessageWithClientId.mockReturnValue(
      throwError(() => ({ ...apiError(409), code: 'idempotency_in_progress' })),
    );
    const result = await build().replay();
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(result.deferred).toBe(1);
  });

  it.each([
    { code: 'idempotency_conflict', expected: { replayed: 0, deferred: 0, failed: 1 } },
    { code: 'idempotency_in_progress', expected: { replayed: 0, deferred: 1, failed: 0 } },
  ])(
    'retains the original send when receipt $code accompanies a native duplicate',
    async ({ code, expected }) => {
      const queued = operation('1', 'c1', 'Saved intention');
      outbox.list.mockResolvedValue([queued]);
      messages.postMessageWithClientId.mockReturnValue(
        throwError(() => ({
          ...apiError(409),
          type: '/problems/client-resource-already-exists',
          code,
        })),
      );

      expect(await build().replay()).toEqual(expected);
      expect(outbox.remove).not.toHaveBeenCalled();
      expect(messages.list).not.toHaveBeenCalled();
      expect(outbox.markFailed).toHaveBeenCalledTimes(expected.failed);
      expect(messages.postMessageWithClientId).toHaveBeenCalledExactlyOnceWith(
        'c1',
        queued.payload.clientId,
        queued.payload.input,
        { idempotencyKey: queued.idempotencyKey },
      );
    },
  );

  it('retains a successfully sent intention when durable acknowledgement fails', async () => {
    const queued = operation('1', 'c1', 'Accepted by the server');
    outbox.list.mockResolvedValue([queued]);
    outbox.remove.mockRejectedValue(new Error('IndexedDB transaction failed'));

    expect(await build().replay()).toEqual({ replayed: 0, deferred: 1, failed: 0 });
    expect(outbox.remove).toHaveBeenCalledExactlyOnceWith(queued.id);
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(messages.postMessageWithClientId).toHaveBeenCalledExactlyOnceWith(
      'c1',
      queued.payload.clientId,
      queued.payload.input,
      { idempotencyKey: queued.idempotencyKey },
    );
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('should treat a replayed client id as done, not as an error', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    messages.postMessageWithClientId.mockReturnValue(
      throwError(() => ({ ...apiError(409), type: '/problems/client-resource-already-exists' })),
    );

    const result = await build().replay();

    // The message is already stored — that is the whole point of the
    // client-minted id.
    expect(outbox.remove).toHaveBeenCalledWith('1');
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(result.replayed).toBe(1);
  });

  it('should stop a conversation at its first temporary failure', async () => {
    outbox.list.mockResolvedValue([
      operation('1', 'c1', 'First.'),
      operation('2', 'c1', 'Second.'),
    ]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => apiError(503)));

    const result = await build().replay();

    // Sending the second before the first would reorder the conversation.
    expect(messages.postMessageWithClientId).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ replayed: 0, deferred: 2, failed: 0 });
  });

  it('should keep draining other conversations when one is blocked', async () => {
    outbox.list.mockResolvedValue([
      operation('1', 'c1', 'Blocked.'),
      operation('2', 'c2', 'Fine.'),
    ]);
    messages.postMessageWithClientId.mockImplementation((conversationId: string) =>
      conversationId === 'c1' ? throwError(() => apiError(503)) : of({ id: 'm1' }),
    );

    const result = await build().replay();

    expect(result).toEqual({ replayed: 1, deferred: 1, failed: 0 });
    expect(outbox.remove).toHaveBeenCalledWith('2');
  });

  it('should defer on a network error', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => new Error('offline')));

    const result = await build().replay();

    expect(result.deferred).toBe(1);
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it('should defer when rate limited rather than giving up', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => apiError(429)));

    const result = await build().replay();

    // 429 is the server asking for patience, not a rejection.
    expect(result.deferred).toBe(1);
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it('should give up on a rejection the server will repeat', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    messages.postMessageWithClientId.mockReturnValue(
      throwError(() => apiError(403, 'You are no longer a participant.')),
    );

    const result = await build().replay();

    expect(outbox.markFailed).toHaveBeenCalledWith('1', 'You are no longer a participant.');
    expect(result).toEqual({ replayed: 0, deferred: 0, failed: 1 });
  });

  it('should leave an already-failed operation alone', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.', 'failed')]);

    const result = await build().replay();

    // It is waiting on the member, not on the network.
    expect(messages.postMessageWithClientId).not.toHaveBeenCalled();
    expect(result).toEqual({ replayed: 0, deferred: 0, failed: 0 });
  });

  it('should announce what left, so the thread can unmark its rows', async () => {
    outbox.list.mockResolvedValue([
      operation('1', 'c1', 'First.'),
      operation('2', 'c1', 'Second.'),
    ]);

    await build().replay();

    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { conversationId: 'c1', clientIds: ['client-1', 'client-2'] },
      }),
    );
  });

  it('should run one pass at a time', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    const service = build();

    const [first, second] = await Promise.all([service.replay(), service.replay()]);

    // A second drain over the same rows would re-send what the first is
    // already sending.
    expect(outbox.list).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it.each([
    { trigger: 'flush', change: 'replacement', response: 'success' },
    { trigger: 'background', change: 'same-account return', response: 'success' },
    { trigger: 'flush', change: 'owner', response: 'failure' },
    { trigger: 'background', change: 'organization', response: 'duplicate' },
  ])(
    'stops $trigger after $change and ignores the late $response',
    async ({ trigger, change, response }) => {
      const held = new Subject<{ id: string }>();
      outbox.list.mockResolvedValue([
        operation('1', 'c1', 'First.'),
        operation('2', 'c2', 'Second.'),
      ]);
      messages.postMessageWithClientId.mockReturnValueOnce(held);
      const service = build();
      const coordinator = TestBed.inject(MessagingSyncCoordinatorService);
      const pass = trigger === 'flush' ? coordinator.flush() : undefined;
      if (trigger === 'background') {
        TestBed.runInInjectionContext(() => coordinator.start());
        TestBed.tick();
      }
      await vi.waitFor(() => expect(messages.postMessageWithClientId).toHaveBeenCalledTimes(1));
      const replay = service.replay();

      if (change === 'organization') organizationId.set('org-2');
      else if (change === 'owner') profile.set({ id: 'account-b' });
      else {
        authenticated.set(false);
        revision.set(2);
        profile.set({ id: 'account-b' });
        if (change === 'same-account return') {
          revision.set(3);
          profile.set({ id: 'account-a' });
        }
        authenticated.set(true);
        sessionEnded.next();
        expect(held.observed).toBe(false);
      }
      if (response === 'success') held.next({ id: 'm1' });
      else held.error(apiError(response === 'duplicate' ? 409 : 403));
      await Promise.all([replay, pass]);

      expect(messages.postMessageWithClientId).toHaveBeenCalledTimes(1);
      expect(outbox.remove).not.toHaveBeenCalled();
      expect(outbox.markFailed).not.toHaveBeenCalled();
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
      expect(await replay).toEqual({ replayed: 0, deferred: 0, failed: 0 });
    },
  );

  it('captures the session before loading the queue', async () => {
    let resolveList!: (operations: readonly MessagingOutboxOperation[]) => void;
    outbox.list.mockReturnValue(
      new Promise<readonly MessagingOutboxOperation[]>((resolve) => {
        resolveList = resolve;
      }),
    );
    const pass = build().replay();
    revision.set(2);
    resolveList([operation('1', 'c1', 'Old account.')]);

    await pass;

    expect(messages.postMessageWithClientId).not.toHaveBeenCalled();
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('does not load or replay a queue without an authenticated owner', async () => {
    authenticated.set(false);
    await build().replay();
    expect(outbox.list).not.toHaveBeenCalled();
    expect(messages.postMessageWithClientId).not.toHaveBeenCalled();
  });

  it('settles a cancelled session without waiting for the old send response', async () => {
    const held = new Subject<{ id: string }>();
    outbox.list.mockResolvedValue([
      operation('1', 'c1', 'First.'),
      operation('2', 'c2', 'Second.'),
    ]);
    messages.postMessageWithClientId.mockReturnValueOnce(held);
    const pass = build().replay();
    await vi.waitFor(() => expect(messages.postMessageWithClientId).toHaveBeenCalledTimes(1));
    revision.set(2);
    sessionEnded.next();

    expect(await pass).toEqual({ replayed: 0, deferred: 0, failed: 0 });
    expect(held.observed).toBe(false);
    expect(messages.postMessageWithClientId).toHaveBeenCalledTimes(1);
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
  const completedExpiry = {
    ...apiError(409),
    code: 'idempotency_replay_expired',
    operationCompleted: true,
  };

  it('reads the original native message across owner pages before acknowledging an expired completed send', async () => {
    const queued = operation('1', 'c1', 'Committed once');
    outbox.list.mockResolvedValue([queued]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
    messages.list
      .mockReturnValueOnce(
        of({ member: [{ id: 'other', conversation: '/api/conversations/c1' }], totalItems: 2 }),
      )
      .mockReturnValueOnce(
        of({
          member: [{ id: queued.payload.clientId, conversation: '/api/conversations/c1' }],
          totalItems: 2,
        }),
      );
    expect(await build().replay()).toEqual({ replayed: 1, deferred: 0, failed: 0 });
    expect(messages.list.mock.calls).toEqual([
      ['c1', { page: 1, itemsPerPage: 100 }],
      ['c1', { page: 2, itemsPerPage: 100 }],
    ]);
    expect(messages.postMessageWithClientId).toHaveBeenCalledExactlyOnceWith(
      'c1',
      queued.payload.clientId,
      queued.payload.input,
      { idempotencyKey: queued.idempotencyKey },
    );
    expect(outbox.remove).toHaveBeenCalledExactlyOnceWith(queued.id);
    expect(outbox.markFailed).not.toHaveBeenCalled();
    const projectionOrder = messages.list.mock.invocationCallOrder[1] ?? 0;
    const acknowledgementOrder = outbox.remove.mock.invocationCallOrder[0] ?? 0;
    expect(projectionOrder).toBeGreaterThan(0);
    expect(acknowledgementOrder).toBeGreaterThan(projectionOrder);
    expect(dispatcher.dispatch).toHaveBeenCalledOnce();
  });

  it('holds the pending send until its current-owner read settles', async () => {
    const queued = operation('1', 'c1', 'Committed once');
    const held = new Subject<{
      member: { id: string; conversation: string }[];
      totalItems: number;
    }>();
    outbox.list.mockResolvedValue([queued]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
    messages.list.mockReturnValue(held);
    const pass = build().replay();
    await vi.waitFor(() => expect(messages.list).toHaveBeenCalledOnce());
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    held.next({
      member: [{ id: queued.payload.clientId, conversation: '/api/conversations/c1' }],
      totalItems: 1,
    });
    expect((await pass).replayed).toBe(1);
    expect(outbox.remove).toHaveBeenCalledExactlyOnceWith(queued.id);
  });

  it.each([403, 404, 503])(
    'retains the completed send as pending when owner reconciliation returns %s',
    async (status) => {
      outbox.list.mockResolvedValue([operation('1', 'c1', 'Committed once')]);
      messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
      messages.list.mockReturnValue(throwError(() => apiError(status)));
      expect(await build().replay()).toEqual({ replayed: 0, deferred: 1, failed: 0 });
      expect(outbox.remove).not.toHaveBeenCalled();
      expect(outbox.markFailed).not.toHaveBeenCalled();
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { member: [], totalItems: 0 },
    { member: [{ id: 'other', conversation: '/api/conversations/c1' }], totalItems: 1 },
    { member: [{ id: 'client-1', conversation: '/api/conversations/other' }], totalItems: 1 },
    { member: [], totalItems: undefined },
  ])(
    'retains a completed send when its native owner projection is missing or invalid: %j',
    async (projection) => {
      outbox.list.mockResolvedValue([operation('1', 'c1', 'Committed once')]);
      messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
      messages.list.mockReturnValue(of(projection));
      expect((await build().replay()).deferred).toBe(1);
      expect(outbox.remove).not.toHaveBeenCalled();
      expect(outbox.markFailed).not.toHaveBeenCalled();
    },
  );

  it('retains a completed send when durable acknowledgement fails', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Committed once')]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
    messages.list.mockReturnValue(
      of({ member: [{ id: 'client-1', conversation: '/api/conversations/c1' }], totalItems: 1 }),
    );
    outbox.remove.mockRejectedValue(new Error('IndexedDB transaction failed'));
    expect(await build().replay()).toEqual({ replayed: 0, deferred: 1, failed: 0 });
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it.each(['session', 'account', 'workspace'])(
    'does not acknowledge an expired completed send after the %s changes during acquisition',
    async (change) => {
      outbox.list.mockResolvedValue([operation('1', 'c1', 'Committed once')]);
      messages.postMessageWithClientId.mockReturnValue(throwError(() => completedExpiry));
      const held = new Subject<{
        member: { id: string; conversation: string }[];
        totalItems: number;
      }>();
      messages.list.mockReturnValue(held);
      const pass = build().replay();
      await vi.waitFor(() => expect(messages.list).toHaveBeenCalledOnce());
      if (change === 'session') revision.set(2);
      else if (change === 'account') profile.set({ id: 'account-b' });
      else organizationId.set('org-2');
      held.next({
        member: [{ id: 'client-1', conversation: '/api/conversations/c1' }],
        totalItems: 1,
      });
      expect(await pass).toEqual({ replayed: 0, deferred: 0, failed: 0 });
      expect(outbox.remove).not.toHaveBeenCalled();
      expect(outbox.markFailed).not.toHaveBeenCalled();
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { status: 409, code: 'idempotency_replay_expired' },
    { status: 409, code: 'idempotency_replay_expired', operationCompleted: false },
    { status: 409, code: 'idempotency_replay_expired', operationCompleted: 'true' },
    { status: 403, code: 'idempotency_replay_expired', operationCompleted: true },
    { status: 409, code: 'idempotency_outcome_unknown', operationCompleted: true },
    { status: 409, code: 'idempotency_result_unavailable', operationCompleted: true },
    { status: 409, code: 'idempotency_owner_lost', operationCompleted: true },
    { status: 409, code: 'idempotency_conflict', operationCompleted: true },
  ])('never acknowledges a non-authoritative expiry or uncertain failure: %j', async (problem) => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Keep original intent')]);
    messages.postMessageWithClientId.mockReturnValue(
      throwError(() => ({ ...apiError(problem.status), ...problem })),
    );
    expect((await build().replay()).failed).toBe(1);
    expect(messages.list).not.toHaveBeenCalled();
    expect(outbox.remove).not.toHaveBeenCalled();
    expect(outbox.markFailed).toHaveBeenCalledOnce();
  });
});
