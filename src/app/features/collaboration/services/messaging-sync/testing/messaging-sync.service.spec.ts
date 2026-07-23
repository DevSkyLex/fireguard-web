import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { MessageService, MessagingOutboxRepository } from '@features/collaboration/data-access';
import type { MessagingOutboxOperation } from '@features/collaboration/models';
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
  };
  let messages: { postMessageWithClientId: ReturnType<typeof vi.fn> };
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };

  function build(): MessagingSyncService {
    TestBed.configureTestingModule({
      providers: [
        MessagingSyncService,
        { provide: MessagingOutboxRepository, useValue: outbox },
        { provide: MessageService, useValue: messages },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });

    return TestBed.inject(MessagingSyncService);
  }

  beforeEach(() => {
    outbox = {
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
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
});
