import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService, type MercureConnectionStatus } from '@core/mercure';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import {
  ConversationService,
  MessageService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { MessagingSyncCoordinatorService } from '@features/organization/features/collaboration/services';
import { ORGANIZATION_MEMBER_ACCESS_PORT } from '@features/organization/ports';
import { MESSAGE_PAGE_SIZE } from '../constants';
import { MessageThreadStore, type MessageThreadStoreType } from '../message-thread.store';

/** What every read of a page asks for, now that the page size is explicit. */
function pageOf(page: number): { page: number; itemsPerPage: number } {
  return { page, itemsPerPage: MESSAGE_PAGE_SIZE };
}

/**
 * Connects and lets the subscription be minted: the token is re-minted on a
 * `timer(0, …)`, so nothing is subscribed until the scheduler has run once.
 * Only valid under fake timers.
 */
function connectRealtime(store: MessageThreadStoreType): void {
  store.connect('conversation-1');
  vi.advanceTimersByTime(1);
}

function message(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/message-1',
    '@type': 'Message',
    id: 'message-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Extincteur 3 non conforme.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 4,
    references: [{ type: 'non_conformity', id: 'nc-1', label: 'NC-12', code: 'NC-12' }],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

function collection(member: readonly MessageOutput[]): HydraCollection<MessageOutput> {
  return {
    '@id': '/api/conversations/conversation-1/messages',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('MessageThreadStore', () => {
  let service: {
    list: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
    postMessageWithClientId: ReturnType<typeof vi.fn>;
    addReaction: ReturnType<typeof vi.fn>;
    removeReaction: ReturnType<typeof vi.fn>;
  };

  let conversations: {
    getSubscription: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
  };
  let mercure: {
    subscribe: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    isConnected: ReturnType<typeof vi.fn>;
  };
  let outbox: {
    queue: ReturnType<typeof vi.fn>;
    listForConversation: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
  };
  let coordinator: { flush: ReturnType<typeof vi.fn> };
  let realtime: Subject<unknown>;
  let topicStatus: WritableSignal<ReadonlyMap<string, MercureConnectionStatus>>;

  function createStore(): MessageThreadStoreType {
    TestBed.configureTestingModule({
      providers: [
        MessageThreadStore,
        { provide: MessageService, useValue: service },
        { provide: ConversationService, useValue: conversations },
        { provide: MercureService, useValue: mercure },
        { provide: MessagingOutboxRepository, useValue: outbox },
        { provide: MessagingSyncCoordinatorService, useValue: coordinator },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: { profile: signal({ id: 'member-1', organizationId: 'org-1' }) },
        },
        // The optimistic row shows the sender their own name rather than the
        // "unknown member" fallback the API's name would otherwise fill in.
        { provide: USER_IDENTITY_PORT, useValue: { displayName: signal('Amélie Rousseau') } },
      ],
    });

    const store: MessageThreadStoreType = TestBed.inject(MessageThreadStore);

    // The reconnect catch-up lives in an effect.
    TestBed.tick();

    return store;
  }

  beforeEach(() => {
    outbox = {
      queue: vi.fn().mockResolvedValue('outbox-1'),
      listForConversation: vi.fn().mockResolvedValue([]),
      retry: vi.fn().mockResolvedValue(undefined),
    };
    coordinator = { flush: vi.fn().mockResolvedValue(undefined) };
    service = {
      list: vi.fn(),
      postMessage: vi.fn(),
      postMessageWithClientId: vi.fn(),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
    };
    realtime = new Subject<unknown>();
    topicStatus = signal<ReadonlyMap<string, MercureConnectionStatus>>(
      new Map<string, MercureConnectionStatus>(),
    );
    conversations = {
      getSubscription: vi.fn().mockReturnValue(of({ topic: 'topic-1', token: 'token-1' })),
      markRead: vi.fn().mockReturnValue(of({ id: 'conversation-1', unreadCount: 3 })),
    };
    mercure = {
      subscribe: vi.fn().mockReturnValue(realtime.asObservable()),
      status: vi.fn(() => topicStatus()),
      isConnected: vi.fn().mockReturnValue(false),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should start empty', () => {
    const store = createStore();

    expect(store.messageEntities()).toHaveLength(0);
    expect(store.hasMore()).toBe(false);
  });

  it('should open on the newest page, not the first', () => {
    service.list.mockReturnValueOnce(
      of({ ...collection([message({ id: 'oldest' })]), totalItems: 120 }),
    );
    service.list.mockReturnValueOnce(
      of({ ...collection([message({ id: 'newest' })]), totalItems: 120 }),
    );

    const store = createStore();
    store.load('conversation-1');

    // 120 messages at 50 a page put the newest ones on page 3.
    expect(service.list).toHaveBeenNthCalledWith(1, 'conversation-1', pageOf(1));
    expect(service.list).toHaveBeenNthCalledWith(2, 'conversation-1', pageOf(3));
    expect(store.messageEntities().map((row) => row.id)).toEqual(['newest']);
    expect(store.hasMore()).toBe(true);
  });

  it('should open a conversation that fits one page in a single request', () => {
    service.list.mockReturnValue(of({ ...collection([message()]), totalItems: 12 }));

    const store = createStore();
    store.load('conversation-1');

    expect(service.list).toHaveBeenCalledTimes(1);
    expect(store.total()).toBe(12);
    expect(store.hasMore()).toBe(false);
  });

  it('should replace the collection when another conversation is opened', () => {
    service.list.mockReturnValueOnce(of(collection([message()])));
    service.list.mockReturnValueOnce(
      of(collection([message({ id: 'message-2', conversation: '/api/conversations/c2' })])),
    );

    const store = createStore();
    store.load('conversation-1');
    store.load('conversation-2');

    // Opening is a fresh read: the previous conversation must not linger.
    expect(store.messageEntities().map((row) => row.id)).toEqual(['message-2']);
  });

  it('should page older history in below the loaded window', () => {
    service.list.mockReturnValueOnce(
      of({ ...collection([message({ id: 'probe' })]), totalItems: 120 }),
    );
    service.list.mockReturnValueOnce(
      of({
        ...collection([message({ id: 'newest', createdAt: '2026-03-01T00:00:00+00:00' })]),
        totalItems: 120,
      }),
    );

    const store = createStore();
    store.load('conversation-1');

    service.list.mockReturnValueOnce(
      of({
        ...collection([message({ id: 'older', createdAt: '2026-02-01T00:00:00+00:00' })]),
        totalItems: 120,
      }),
    );
    store.loadOlder();

    expect(service.list).toHaveBeenLastCalledWith('conversation-1', pageOf(2));
    // Insertion order is not chronological once history lands behind the newest page.
    expect(store.sortedMessages().map((row) => row.id)).toEqual(['older', 'newest']);
  });

  it('should stop paging older history at the first page', () => {
    service.list.mockReturnValue(of({ ...collection([message()]), totalItems: 12 }));

    const store = createStore();
    store.load('conversation-1');
    service.list.mockClear();
    store.loadOlder();

    expect(service.list).not.toHaveBeenCalled();
  });

  it('should empty the thread so another conversation can be opened into it', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.postMessageWithClientId.mockReturnValue(throwError(() => new Error('offline')));

    const store = createStore();
    store.load('conversation-1');
    store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

    expect(store.failedMessageIds()).toHaveLength(1);

    store.reset();

    // The router reuses the page component, so nothing else clears these.
    expect(store.messageEntities()).toHaveLength(0);
    expect(store.failedMessageIds()).toEqual([]);
    expect(store.conversationId()).toBeNull();
    expect(store.total()).toBe(0);
  });

  it('should keep replyCount and references when a reaction lands', () => {
    service.list.mockReturnValue(of(collection([message()])));
    // The reaction handler rebuilds the message without those two arguments,
    // so its response always claims 0 replies and no references.
    service.addReaction.mockReturnValue(
      of(
        message({
          replyCount: 0,
          references: [],
          reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
        }),
      ),
    );

    const store = createStore();
    store.load('conversation-1');
    store.react({ messageId: 'message-1', input: { emoji: '👍' } });

    const updated = store.messageEntityMap()['message-1'];

    expect(updated.reactions).toHaveLength(1);
    expect(updated.replyCount).toBe(4);
    expect(updated.references).toHaveLength(1);
  });

  it('should drop the member from a reaction tally when removed, and remove a chip that empties', () => {
    service.list.mockReturnValue(
      of(
        collection([
          message({
            reactions: [
              { emoji: '👍', count: 2, reactedByMe: true },
              { emoji: '🎉', count: 1, reactedByMe: true },
            ],
          }),
        ]),
      ),
    );
    // The endpoint answers 204 with no body — the tally is recomputed locally.
    service.removeReaction.mockReturnValue(of(undefined));

    const store = createStore();
    store.load('conversation-1');

    store.removeReaction({ messageId: 'message-1', emoji: '👍' });
    expect(store.messageEntityMap()['message-1'].reactions).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false },
      { emoji: '🎉', count: 1, reactedByMe: true },
    ]);

    // Removing the last one drops the chip entirely.
    store.removeReaction({ messageId: 'message-1', emoji: '🎉' });
    expect(store.messageEntityMap()['message-1'].reactions).toEqual([
      { emoji: '👍', count: 1, reactedByMe: false },
    ]);
    expect(service.removeReaction).toHaveBeenCalledWith('message-1', '🎉');
  });

  it('should move the read marker when a conversation is marked read', () => {
    service.list.mockReturnValue(of(collection([message()])));

    const store = createStore();
    store.load('conversation-1');
    store.markRead({ conversationId: 'conversation-1' });

    expect(conversations.markRead).toHaveBeenCalledWith('conversation-1', undefined);
  });

  it('should move the read marker to a chosen message when one is given', () => {
    service.list.mockReturnValue(of(collection([message()])));

    const store = createStore();
    store.load('conversation-1');
    store.markRead({ conversationId: 'conversation-1', lastReadMessageId: 'message-1' });

    expect(conversations.markRead).toHaveBeenCalledWith('conversation-1', {
      lastReadMessageId: 'message-1',
    });
  });

  it('should withdraw a reaction the reader is part of, and add one they are not', () => {
    service.list.mockReturnValue(
      of(collection([message({ reactions: [{ emoji: '👍', count: 2, reactedByMe: true }] })])),
    );
    service.removeReaction.mockReturnValue(of(undefined));
    service.addReaction.mockReturnValue(
      of(message({ reactions: [{ emoji: '🎉', count: 1, reactedByMe: true }] })),
    );

    const store = createStore();
    store.load('conversation-1');

    // A chip is a toggle, and only the store knows which way it points.
    store.toggleReaction('message-1', '👍');
    expect(service.removeReaction).toHaveBeenCalledWith('message-1', '👍');

    store.toggleReaction('message-1', '🎉');
    expect(service.addReaction).toHaveBeenCalledWith('message-1', { emoji: '🎉' });
  });

  it('should add a reaction to a message it does not hold rather than throwing', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.addReaction.mockReturnValue(of(message()));

    const store = createStore();
    store.load('conversation-1');
    store.toggleReaction('absent', '👍');

    expect(service.addReaction).toHaveBeenCalledWith('absent', { emoji: '👍' });
  });

  describe('sending', () => {
    /** The client id the store minted for the one send under test. */
    function sentClientId(): string {
      return service.postMessageWithClientId.mock.calls[0][1] as string;
    }

    it('should show the message before the server has confirmed it', () => {
      service.list.mockReturnValue(of(collection([])));
      // Never resolves: the row must be on screen while the request is open.
      service.postMessageWithClientId.mockReturnValue(new Subject());

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      const optimistic = store.messageEntities()[0];

      expect(optimistic.body).toBe('Bien reçu.');
      expect(optimistic.authorMember).toBe('/api/organizations/org-1/members/member-1');
      expect(store.pendingMessageIds()).toEqual([optimistic.id]);
      expect(store.total()).toBe(1);
    });

    it('should send under a client-minted id and confirm onto the same row', () => {
      service.list.mockReturnValue(of(collection([])));
      service.postMessageWithClientId.mockImplementation((_conversation, clientId: string) =>
        of(message({ id: clientId, body: 'Bien reçu.' })),
      );

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      // The id was ours, so there is no row to swap and no duplicate to
      // reconcile — including against the Mercure echo of our own message.
      expect(store.messageEntities()).toHaveLength(1);
      expect(store.messageEntities()[0].id).toBe(sentClientId());
      expect(store.pendingMessageIds()).toEqual([]);
      expect(store.total()).toBe(1);
    });

    it('should treat a replayed client id as success', () => {
      service.list.mockReturnValue(of(collection([])));
      // The shape `HydraApiService.handleError` actually propagates.
      service.postMessageWithClientId.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 409,
          type: '/problems/client-resource-already-exists',
          title: 'Conflict',
          detail: 'A resource with this client identifier already exists.',
        })),
      );

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      // 409 means the message is already stored — queueing it again would be
      // wrong and showing an error would be a lie.
      expect(store.pendingMessageIds()).toEqual([]);
      expect(store.failedMessageIds()).toEqual([]);
      expect(outbox.queue).not.toHaveBeenCalled();
      expect(store.postError()).toBeNull();
    });

    it('should keep a failed message on screen and queue it durably', () => {
      service.list.mockReturnValue(of(collection([])));
      service.postMessageWithClientId.mockReturnValue(throwError(() => new Error('offline')));

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      const clientId: string = sentClientId();

      expect(store.messageEntities()).toHaveLength(1);
      expect(store.failedMessageIds()).toEqual([clientId]);
      expect(outbox.queue).toHaveBeenCalledWith('conversation-1', 'message.send', {
        conversationId: 'conversation-1',
        clientId,
        input: { body: 'Bien reçu.' },
      });
    });

    it('should not cancel an in-flight send when another is started', () => {
      service.list.mockReturnValue(of(collection([])));
      service.postMessageWithClientId.mockReturnValue(new Subject());

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'First.' } });
      store.send({ conversationId: 'conversation-1', input: { body: 'Second.' } });

      // Two messages are two intentions; `switchMap` would have dropped the
      // first after its composer had already cleared.
      expect(service.postMessageWithClientId).toHaveBeenCalledTimes(2);
      expect(store.pendingMessageIds()).toHaveLength(2);
    });

    it('should not land a confirmation in the conversation opened after it', () => {
      const inFlight = new Subject<MessageOutput>();
      service.list.mockReturnValue(of(collection([])));
      service.postMessageWithClientId.mockReturnValue(inFlight);

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      store.reset();
      store.load('conversation-2');

      inFlight.next(message({ id: 'confirmed' }));
      inFlight.complete();

      // `mergeMap` lets a send outlive the route change that started it.
      expect(store.messageEntityMap()['confirmed']).toBeUndefined();
    });

    it('should still queue a failed message after the reader has moved on', () => {
      const inFlight = new Subject<MessageOutput>();
      service.list.mockReturnValue(of(collection([])));
      service.postMessageWithClientId.mockReturnValue(inFlight);

      const store = createStore();
      store.load('conversation-1');
      store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

      const clientId: string = sentClientId();

      store.reset();
      store.load('conversation-2');
      inFlight.error(new Error('offline'));

      // The message was written and is owed a delivery wherever the reader went.
      expect(outbox.queue).toHaveBeenCalledWith('conversation-1', 'message.send', {
        conversationId: 'conversation-1',
        clientId,
        input: { body: 'Bien reçu.' },
      });
      expect(store.failedMessageIds()).toEqual([]);
    });
  });

  it('should retry a failed message by re-queuing its outbox operation and flushing', async () => {
    service.list.mockReturnValue(of(collection([])));
    service.postMessageWithClientId.mockReturnValue(throwError(() => new Error('offline')));

    const store = createStore();
    store.load('conversation-1');
    store.send({ conversationId: 'conversation-1', input: { body: 'Bien reçu.' } });

    const clientId: string = service.postMessageWithClientId.mock.calls[0][1] as string;
    outbox.listForConversation.mockResolvedValue([{ id: 'outbox-op-1', payload: { clientId } }]);

    await store.retryFailed(clientId);

    expect(outbox.listForConversation).toHaveBeenCalledWith('conversation-1');
    expect(outbox.retry).toHaveBeenCalledWith('outbox-op-1');
    expect(coordinator.flush).toHaveBeenCalled();
    expect(store.failedMessageIds()).toEqual([]);
    expect(store.pendingMessageIds()).toEqual([clientId]);
  });

  it('should no-op retryFailed when the outbox has no matching operation', async () => {
    service.list.mockReturnValue(of(collection([])));

    const store = createStore();
    store.load('conversation-1');
    outbox.listForConversation.mockResolvedValue([]);

    await store.retryFailed('missing-client-id');

    expect(outbox.retry).not.toHaveBeenCalled();
    expect(coordinator.flush).not.toHaveBeenCalled();
  });

  it('should no-op retryFailed when no conversation is loaded', async () => {
    const store = createStore();

    await expect(store.retryFailed('missing-client-id')).resolves.toBeUndefined();
  });

  it('should keep an interaction failure off the posting call state', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.addReaction.mockReturnValue(throwError(() => new Error('rate limited')));

    const store = createStore();
    store.load('conversation-1');
    store.react({ messageId: 'message-1', input: { emoji: '👍' } });

    // A failed reaction must not make the composer look broken.
    expect(store.postError()).toBeNull();
    expect(store.isPosting()).toBe(false);
  });

  it('should record a load failure without dropping fetched messages', () => {
    service.list.mockReturnValueOnce(
      of({ ...collection([message({ id: 'probe' })]), totalItems: 120 }),
    );
    service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 120 }));

    const store = createStore();
    store.load('conversation-1');

    service.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.loadOlder();

    expect(store.loadError()).not.toBeNull();
    expect(store.messageEntities()).toHaveLength(1);
  });

  describe('realtime', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** Marks a topic's health and lets the reconnect effect observe it. */
    function setStatus(status: MercureConnectionStatus): void {
      topicStatus.set(new Map<string, MercureConnectionStatus>([['topic-1', status]]));
      TestBed.tick();
    }

    it('should subscribe to the conversation topic', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      connectRealtime(store);

      expect(conversations.getSubscription).toHaveBeenCalledWith('conversation-1');
      expect(mercure.subscribe).toHaveBeenCalledWith('topic-1', 'token-1');
    });

    it('should refetch the recent page when a frame arrives', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);
      service.list.mockClear();

      realtime.next({ type: 'message.created', messageId: 'message-2' });
      vi.advanceTimersByTime(500);

      // The frame is a signal, not data: it carries six fields where the
      // store needs twelve, so the page is re-read instead.
      expect(service.list).toHaveBeenCalledWith('conversation-1', pageOf(1));
    });

    it('should coalesce a burst of frames into one refetch', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);
      service.list.mockClear();

      realtime.next({ type: 'message.created' });
      realtime.next({ type: 'reaction.added' });
      realtime.next({ type: 'message.pinned' });
      vi.advanceTimersByTime(500);

      expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('should fold new messages in without dropping paged-in history', () => {
      service.list.mockReturnValueOnce(
        of({ ...collection([message({ id: 'probe' })]), totalItems: 120 }),
      );
      service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 120 }));

      const store = createStore();
      store.load('conversation-1');

      service.list.mockReturnValueOnce(
        of({ ...collection([message({ id: 'message-0' })]), totalItems: 120 }),
      );
      store.loadOlder();

      service.list.mockReturnValue(
        of({
          ...collection([message(), message({ id: 'message-2' })]),
          totalItems: 121,
        }),
      );
      connectRealtime(store);
      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      // Replacing here would throw away the older page the member scrolled to.
      expect(
        store
          .messageEntities()
          .map((row) => row.id)
          .toSorted(),
      ).toEqual(['message-0', 'message-1', 'message-2']);
      expect(store.total()).toBe(121);
    });

    it('should follow the boundary when a message opens a new newest page', () => {
      service.list.mockReturnValueOnce(
        of({ ...collection([message({ id: 'probe' })]), totalItems: 100 }),
      );
      service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 100 }));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);
      service.list.mockClear();

      service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 101 }));
      service.list.mockReturnValueOnce(
        of({ ...collection([message({ id: 'message-2' })]), totalItems: 101 }),
      );

      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      // The 101st message opened page 3, which did not exist when the thread did.
      expect(service.list).toHaveBeenLastCalledWith('conversation-1', pageOf(3));
      expect(store.messageEntityMap()['message-2']).toBeDefined();
    });

    it('should re-mint the subscription token before the hub expires it', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      connectRealtime(store);

      expect(conversations.getSubscription).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(600_000);

      // A fresh token only takes effect on reopen: it travels in the socket URL.
      expect(conversations.getSubscription).toHaveBeenCalledTimes(2);
      expect(mercure.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should refetch silently, without flashing a loading state', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);

      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      // A spinner over a conversation someone is reading is worse than the
      // staleness it fixes.
      expect(store.isLoading()).toBe(false);
      expect(store.loadError()).toBeNull();
    });

    it('should keep the thread usable when a background refetch fails', () => {
      service.list.mockReturnValueOnce(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);

      service.list.mockReturnValue(throwError(() => new Error('offline')));
      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      expect(store.messageEntities()).toHaveLength(1);
      expect(store.loadError()).toBeNull();
    });

    it('should catch up after a reconnection', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);
      setStatus('connected');
      service.list.mockClear();

      setStatus('reconnecting');
      setStatus('connected');
      vi.advanceTimersByTime(500);

      // The hub replays nothing, so anything published during the gap is only
      // recoverable by re-reading.
      expect(service.list).toHaveBeenCalledWith('conversation-1', pageOf(1));
    });

    it('should not refetch while the connection merely stays up', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);
      setStatus('connected');
      service.list.mockClear();

      setStatus('connected');
      vi.advanceTimersByTime(500);

      expect(service.list).not.toHaveBeenCalled();
    });

    it('should leave the thread working when the subscription bootstrap fails', () => {
      service.list.mockReturnValue(of(collection([message()])));
      conversations.getSubscription.mockReturnValue(throwError(() => new Error('no topic')));

      const store = createStore();
      store.load('conversation-1');
      connectRealtime(store);

      // Realtime is an enhancement; losing it must not surface as a thread
      // error.
      expect(store.messageEntities()).toHaveLength(1);
      expect(store.loadError()).toBeNull();
      expect(mercure.subscribe).not.toHaveBeenCalled();
    });
  });
});
