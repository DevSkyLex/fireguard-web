import { TestBed } from '@angular/core/testing';
import type { MessagingOutboxOperation } from '@features/collaboration/models';
import { MessagingDatabaseService } from '../messaging-database.service';
import { MessagingOutboxRepository } from '../messaging-outbox.repository';

/** The messaging database, backed by a Map. */
function inMemoryDatabase(store: Map<string, unknown>) {
  return {
    browser: true,
    ensureOwnerBound: vi.fn().mockResolvedValue(undefined),
    put: vi.fn(async (_storeName: string, key: string, value: unknown) => {
      store.set(key, value);
    }),
    get: vi.fn(async (_storeName: string, key: string) => store.get(key) ?? null),
    getAll: vi.fn(async () => [...store.values()]),
    remove: vi.fn(async (_storeName: string, key: string) => {
      store.delete(key);
    }),
  };
}

/** A `message.send` payload with a fresh client id. */
function send(conversationId: string, body: string) {
  return { conversationId, clientId: crypto.randomUUID(), input: { body } };
}

describe('MessagingOutboxRepository', () => {
  let store: Map<string, unknown>;
  let database: ReturnType<typeof inMemoryDatabase>;

  function build(): MessagingOutboxRepository {
    TestBed.configureTestingModule({
      providers: [
        MessagingOutboxRepository,
        { provide: MessagingDatabaseService, useValue: database },
      ],
    });

    return TestBed.inject(MessagingOutboxRepository);
  }

  beforeEach(() => {
    store = new Map<string, unknown>();
    database = inMemoryDatabase(store);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should queue an operation as pending and count it', async () => {
    const repository = build();

    await repository.queue('c1', 'message.send', send('c1', 'Bien reçu.'));

    expect(repository.pendingCount()).toBe(1);
    expect(repository.failedCount()).toBe(0);
    expect(database.ensureOwnerBound).toHaveBeenCalled();
  });

  it('should keep same-millisecond writes in order', async () => {
    const repository = build();
    // Freeze the clock so both writes claim the same instant.
    vi.spyOn(Date, 'now').mockReturnValue(1_000);

    await repository.queue('c1', 'message.send', send('c1', 'First.'));
    await repository.queue('c1', 'message.send', send('c1', 'Second.'));

    const queue: readonly MessagingOutboxOperation[] = await repository.list();

    // Without the monotonic stamp both rows would carry the same timestamp and
    // replay in whatever order the store happened to yield.
    expect(queue.map((operation) => operation.payload.input.body)).toEqual(['First.', 'Second.']);
  });

  it('should narrow the queue to one conversation', async () => {
    const repository = build();

    await repository.queue('c1', 'message.send', send('c1', 'For c1.'));
    await repository.queue('c2', 'message.send', send('c2', 'For c2.'));

    const queue: readonly MessagingOutboxOperation[] = await repository.listForConversation('c1');

    expect(queue).toHaveLength(1);
    expect(queue[0].payload.input.body).toBe('For c1.');
  });

  it('should move a failed operation out of the pending count', async () => {
    const repository = build();
    await repository.queue('c1', 'message.send', send('c1', 'Bien reçu.'));
    const [operation] = await repository.list();

    await repository.markFailed(operation.id, 'Network unreachable');

    // Anything waiting for the queue to drain must not block on work that
    // cannot drain without the member.
    expect(repository.pendingCount()).toBe(0);
    expect(repository.failedCount()).toBe(1);
  });

  it('should return a failed operation to the queue on retry', async () => {
    const repository = build();
    await repository.queue('c1', 'message.send', send('c1', 'Bien reçu.'));
    const [operation] = await repository.list();
    await repository.markFailed(operation.id, 'Network unreachable');

    await repository.retry(operation.id);

    expect(repository.pendingCount()).toBe(1);
    expect(repository.failedCount()).toBe(0);
    expect((await repository.list())[0].error).toBeNull();
  });

  it('should drop an operation once it is done', async () => {
    const repository = build();
    await repository.queue('c1', 'message.send', send('c1', 'Bien reçu.'));
    const [operation] = await repository.list();

    await repository.remove(operation.id);

    expect(await repository.list()).toHaveLength(0);
    expect(repository.pendingCount()).toBe(0);
  });

  it('should count a row written without a status as pending', async () => {
    const repository = build();
    // A row from a version that predates the field.
    store.set('legacy', {
      id: 'legacy',
      conversationId: 'c1',
      type: 'message.send',
      payload: send('c1', 'Older.'),
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await repository.refresh();

    expect(repository.pendingCount()).toBe(1);
  });

  it('should ignore a mutation targeting a row that is gone', async () => {
    const repository = build();

    await repository.markFailed('missing', 'boom');
    await repository.retry('missing');

    expect(repository.pendingCount()).toBe(0);
    expect(repository.failedCount()).toBe(0);
  });
});
