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
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
    pendingCount: WritableSignal<number>;
    failedCount: WritableSignal<number>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let messages: { postMessageWithClientId: ReturnType<typeof vi.fn> };
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
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      pendingCount: signal(2),
      failedCount: signal(0),
      refresh: vi.fn().mockResolvedValue(undefined),
    };
    messages = { postMessageWithClientId: vi.fn().mockReturnValue(of({ id: 'm1' })) };
    dispatcher = { dispatch: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should replay a queued send and dequeue it', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);

    const result = await build().replay();

    expect(messages.postMessageWithClientId).toHaveBeenCalledWith('c1', 'client-1', {
      body: 'Bien reçu.',
    });
    expect(outbox.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ replayed: 1, deferred: 0, failed: 0 });
  });

  it('should treat a replayed client id as done, not as an error', async () => {
    outbox.list.mockResolvedValue([operation('1', 'c1', 'Bien reçu.')]);
    messages.postMessageWithClientId.mockReturnValue(throwError(() => apiError(409)));

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
});
