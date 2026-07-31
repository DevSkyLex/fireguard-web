import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
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
import { messageRepliesStoreEvents } from '../../message-replies';
import { MessageThreadStore, type MessageThreadStoreType } from '../message-thread.store';

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
    edit: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    addReaction: ReturnType<typeof vi.fn>;
    removeReaction: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    unsave: ReturnType<typeof vi.fn>;
    pin: ReturnType<typeof vi.fn>;
    unpin: ReturnType<typeof vi.fn>;
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
      edit: vi.fn(),
      remove: vi.fn(),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      save: vi.fn(),
      unsave: vi.fn(),
      pin: vi.fn(),
      unpin: vi.fn(),
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

  it('should drive hasMore from the server total, not the row count', () => {
    const page = collection([message()]);
    service.list.mockReturnValue(of({ ...page, totalItems: 40 }));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });

    expect(store.total()).toBe(40);
    expect(store.hasMore()).toBe(true);
  });

  it('should replace the collection when another conversation is opened', () => {
    service.list.mockReturnValueOnce(of(collection([message()])));
    service.list.mockReturnValueOnce(
      of(collection([message({ id: 'message-2', conversation: '/api/conversations/c2' })])),
    );

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.load({ conversationId: 'conversation-2' });

    // Page 1 is a fresh read: the previous conversation must not linger.
    expect(store.messageEntities().map((row) => row.id)).toEqual(['message-2']);
  });

  it('should append when older history is paged in', () => {
    service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 2 }));
    service.list.mockReturnValueOnce(
      of({ ...collection([message({ id: 'message-2' })]), totalItems: 2 }),
    );

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.load({ conversationId: 'conversation-1', page: 2 });

    expect(store.messageEntities().map((row) => row.id)).toEqual(['message-1', 'message-2']);
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
    store.load({ conversationId: 'conversation-1' });
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
    store.load({ conversationId: 'conversation-1' });

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
    store.load({ conversationId: 'conversation-1' });
    store.markRead({ conversationId: 'conversation-1' });

    expect(conversations.markRead).toHaveBeenCalledWith('conversation-1', undefined);
  });

  it('should move the read marker to a chosen message when one is given', () => {
    service.list.mockReturnValue(of(collection([message()])));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.markRead({ conversationId: 'conversation-1', lastReadMessageId: 'message-1' });

    expect(conversations.markRead).toHaveBeenCalledWith('conversation-1', {
      lastReadMessageId: 'message-1',
    });
  });

  it('should unsave a message that is already saved, and save one that is not', () => {
    service.list.mockReturnValue(of(collection([message({ isSaved: true })])));
    service.unsave.mockReturnValue(of(undefined));
    service.save.mockReturnValue(of(message({ isSaved: true })));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });

    // The bookmark button is a toggle; before this it only ever saved, so a
    // second press re-saved an already-saved message.
    store.toggleSave('message-1');
    expect(service.unsave).toHaveBeenCalledWith('message-1');
    expect(store.messageEntityMap()['message-1'].isSaved).toBe(false);

    store.toggleSave('message-1');
    expect(service.save).toHaveBeenCalledWith('message-1');
  });

  it('should unpin a pinned message and clear both pin fields', () => {
    service.list.mockReturnValue(
      of(collection([message({ pinnedAt: '2026-01-02T00:00:00+00:00', pinnedBy: 'member-2' })])),
    );
    service.unpin.mockReturnValue(of(undefined));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.togglePin('message-1');

    expect(service.unpin).toHaveBeenCalledWith('message-1');
    // The Pins tab reads `pinnedAt`; a row that kept it would stay listed.
    expect(store.messageEntityMap()['message-1'].pinnedAt).toBeUndefined();
    expect(store.pinnedMessages()).toHaveLength(0);
  });

  it('should bump the parent reply count when the replies store posts', () => {
    service.list.mockReturnValue(of(collection([message()])));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });

    TestBed.inject(Dispatcher).dispatch(messageRepliesStoreEvents.posted('message-1'));

    // Refetching would not do: `refresh` only re-reads page 1, and a parent
    // deep in the history is not on it.
    expect(store.messageEntityMap()['message-1'].replyCount).toBe(5);
  });

  it('should keep replyCount and references when a save lands', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.save.mockReturnValue(of(message({ isSaved: true, replyCount: 0, references: [] })));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.save('message-1');

    const updated = store.messageEntityMap()['message-1'];

    expect(updated.isSaved).toBe(true);
    expect(updated.replyCount).toBe(4);
    expect(updated.references).toHaveLength(1);
  });

  it('should redact a deleted message in place rather than removing it', () => {
    service.list.mockReturnValue(of(collection([message({ reactions: [] })])));
    service.remove.mockReturnValue(of(undefined));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.remove('message-1');

    const tombstone = store.messageEntityMap()['message-1'];

    // The server keeps the row for compliance and redacts it at the boundary;
    // the local copy has to match, not disappear.
    expect(tombstone).toBeDefined();
    expect(tombstone.isDeleted).toBe(true);
    expect(tombstone.body).toBeUndefined();
    expect(store.visibleMessages()).toHaveLength(0);
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
      store.load({ conversationId: 'conversation-1' });
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
      store.load({ conversationId: 'conversation-1' });
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
      store.load({ conversationId: 'conversation-1' });
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
      store.load({ conversationId: 'conversation-1' });
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
      store.load({ conversationId: 'conversation-1' });
      store.send({ conversationId: 'conversation-1', input: { body: 'First.' } });
      store.send({ conversationId: 'conversation-1', input: { body: 'Second.' } });

      // Two messages are two intentions; `switchMap` would have dropped the
      // first after its composer had already cleared.
      expect(service.postMessageWithClientId).toHaveBeenCalledTimes(2);
      expect(store.pendingMessageIds()).toHaveLength(2);
    });
  });

  it('should order pinned messages most recently pinned first', () => {
    service.list.mockReturnValue(
      of(
        collection([
          message({ id: 'message-1', pinnedAt: '2026-01-01T00:00:00+00:00' }),
          message({ id: 'message-2', pinnedAt: '2026-03-01T00:00:00+00:00' }),
          message({ id: 'message-3' }),
        ]),
      ),
    );

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });

    expect(store.pinnedMessages().map((m: MessageOutput) => m.id)).toEqual([
      'message-2',
      'message-1',
    ]);
  });

  it('should edit a message in place', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.edit.mockReturnValue(of(message({ body: 'Edited text.' })));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.edit({ messageId: 'message-1', input: { body: 'Edited text.' } });

    expect(store.messageEntityMap()['message-1'].body).toBe('Edited text.');
    expect(store.postError()).toBeNull();
  });

  it('should record a post error when editing fails', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.edit.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.edit({ messageId: 'message-1', input: { body: 'Edited text.' } });

    expect(store.postError()).not.toBeNull();
  });

  it('should record a post error when deleting a message fails', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.remove.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.remove('message-1');

    expect(store.postError()).not.toBeNull();
    expect(store.messageEntityMap()['message-1'].isDeleted).toBe(false);
  });

  it('should record an interaction error when saving a message fails', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.save.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.save('message-1');

    expect(store.messageEntityMap()['message-1'].isSaved).toBe(false);
  });

  it('should upsert the returned message when pinning succeeds', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.pin.mockReturnValue(of(message({ pinnedAt: '2026-02-01T00:00:00+00:00' })));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.pin('message-1');

    expect(store.messageEntityMap()['message-1'].pinnedAt).toBe('2026-02-01T00:00:00+00:00');
    expect(store.pinnedMessages()).toHaveLength(1);
  });

  it('should record an interaction error when pinning fails', () => {
    service.list.mockReturnValue(of(collection([message()])));
    service.pin.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
    store.pin('message-1');

    expect(store.messageEntityMap()['message-1'].pinnedAt).toBeUndefined();
  });

  it('should retry a failed message by re-queuing its outbox operation and flushing', async () => {
    service.list.mockReturnValue(of(collection([])));
    service.postMessageWithClientId.mockReturnValue(throwError(() => new Error('offline')));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });
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
    store.load({ conversationId: 'conversation-1' });
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
    store.load({ conversationId: 'conversation-1' });
    store.react({ messageId: 'message-1', input: { emoji: '👍' } });

    // A failed reaction must not make the composer look broken.
    expect(store.postError()).toBeNull();
    expect(store.isPosting()).toBe(false);
  });

  it('should record a load failure without dropping fetched messages', () => {
    service.list.mockReturnValueOnce(of(collection([message()])));

    const store = createStore();
    store.load({ conversationId: 'conversation-1' });

    service.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.load({ conversationId: 'conversation-1', page: 2 });

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
      store.connect('conversation-1');

      expect(conversations.getSubscription).toHaveBeenCalledWith('conversation-1');
      expect(mercure.subscribe).toHaveBeenCalledWith('topic-1', 'token-1');
    });

    it('should refetch the recent page when a frame arrives', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');
      service.list.mockClear();

      realtime.next({ type: 'message.created', messageId: 'message-2' });
      vi.advanceTimersByTime(500);

      // The frame is a signal, not data: it carries six fields where the
      // store needs twelve, so the page is re-read instead.
      expect(service.list).toHaveBeenCalledWith('conversation-1', { page: 1 });
    });

    it('should coalesce a burst of frames into one refetch', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');
      service.list.mockClear();

      realtime.next({ type: 'message.created' });
      realtime.next({ type: 'reaction.added' });
      realtime.next({ type: 'message.pinned' });
      vi.advanceTimersByTime(500);

      expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('should fold new messages in without dropping paged-in history', () => {
      service.list.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 2 }));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });

      service.list.mockReturnValueOnce(
        of({ ...collection([message({ id: 'message-0' })]), totalItems: 2 }),
      );
      store.load({ conversationId: 'conversation-1', page: 2 });

      service.list.mockReturnValue(
        of({
          ...collection([message(), message({ id: 'message-2' })]),
          totalItems: 3,
        }),
      );
      store.connect('conversation-1');
      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      // Replacing here would throw away the older page the member scrolled to.
      expect(
        store
          .messageEntities()
          .map((row) => row.id)
          .toSorted(),
      ).toEqual(['message-0', 'message-1', 'message-2']);
      expect(store.total()).toBe(3);
    });

    it('should refetch silently, without flashing a loading state', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');

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
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');

      service.list.mockReturnValue(throwError(() => new Error('offline')));
      realtime.next({ type: 'message.created' });
      vi.advanceTimersByTime(500);

      expect(store.messageEntities()).toHaveLength(1);
      expect(store.loadError()).toBeNull();
    });

    it('should catch up after a reconnection', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');
      setStatus('connected');
      service.list.mockClear();

      setStatus('reconnecting');
      setStatus('connected');
      vi.advanceTimersByTime(500);

      // The hub replays nothing, so anything published during the gap is only
      // recoverable by re-reading.
      expect(service.list).toHaveBeenCalledWith('conversation-1', { page: 1 });
    });

    it('should not refetch while the connection merely stays up', () => {
      service.list.mockReturnValue(of(collection([message()])));

      const store = createStore();
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');
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
      store.load({ conversationId: 'conversation-1' });
      store.connect('conversation-1');

      // Realtime is an enhancement; losing it must not surface as a thread
      // error.
      expect(store.messageEntities()).toHaveLength(1);
      expect(store.loadError()).toBeNull();
      expect(mercure.subscribe).not.toHaveBeenCalled();
    });
  });
});
