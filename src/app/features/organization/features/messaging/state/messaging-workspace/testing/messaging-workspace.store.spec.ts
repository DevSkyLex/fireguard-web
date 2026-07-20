import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject } from 'rxjs';
import { MercureService } from '@core/mercure';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ConversationInventoryStore } from '../../conversation-inventory';
import { MessagingWorkspaceStore } from '../messaging-workspace.store';

const message = (id: string, body: string, createdAt: string): MessageOutput =>
  ({
    '@id': `/api/messages/${id}`,
    '@type': 'Message',
    id,
    conversation: 'c1',
    authorMember: 'm1',
    body,
    mentions: [],
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    attachments: [],
    pinnedAt: null,
    pinnedBy: null,
    reactions: [],
    isSaved: false,
    replyCount: 0,
    createdAt,
    updatedAt: createdAt,
  }) as MessageOutput;

describe('MessagingWorkspaceStore live thread', () => {
  const hub = new Subject<MessageOutput>();
  let addReaction: ReturnType<typeof vi.fn>;
  let removeReaction: ReturnType<typeof vi.fn>;

  let listMessages: ReturnType<typeof vi.fn>;
  let pingPresence: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pingPresence = vi.fn(() => of({ memberId: 'member-abc', online: true, lastSeenAt: 'now' }));
    addReaction = vi.fn(() => EMPTY);
    removeReaction = vi.fn(() => of(undefined));
  });

  const createStore = (
    initial: readonly MessageOutput[],
    options: { readonly total?: number; readonly older?: readonly MessageOutput[] } = {},
  ) => {
    listMessages = vi.fn((_id: string, request?: { readonly page?: number }) =>
      of(
        (request?.page ?? 1) > 1
          ? { member: options.older ?? [], totalItems: options.total ?? initial.length }
          : { member: initial, totalItems: options.total ?? initial.length },
      ),
    );
    TestBed.configureTestingModule({
      providers: [
        MessagingWorkspaceStore,
        ConversationInventoryStore,
        {
          provide: MessagingService,
          useValue: {
            listConversations: vi.fn(() => of({ member: [], totalItems: 0 })),
            listMessages,
            getSubscription: vi.fn(() => of({ token: 'jwt', topic: 'conversation/c1' })),
            listAttachments: vi.fn(() => of({ member: [], totalItems: 0 })),
            markRead: vi.fn(() => EMPTY),
            pingPresence,
            addReaction,
            removeReaction,
          },
        },
        { provide: MercureService, useValue: { subscribe: vi.fn(() => hub.asObservable()) } },
        // The root conversation inventory, reached through the workspace
        // store's delegation, follows the organization context — kept empty
        // here so it stays idle.
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization: signal(null) } },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: { permissions: signal<ReadonlyArray<string>>([]) },
        },
      ],
    });

    const store = TestBed.inject(MessagingWorkspaceStore);
    store.selectConversation('c1');
    return store;
  };

  it('should append a message that arrives from the hub', () => {
    const store = createStore([message('m1', 'first', '2026-07-01T10:00:00Z')]);

    hub.next(message('m2', 'second', '2026-07-01T10:01:00Z'));

    expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  // The sender's own message arrives twice: once from the POST response, once
  // echoed by the hub. Appending both would show it duplicated to its author
  // and nobody else — the worst kind of bug to reproduce.
  it('should replace rather than duplicate a message it already has', () => {
    const store = createStore([message('m1', 'first', '2026-07-01T10:00:00Z')]);

    hub.next(message('m1', 'first (edited)', '2026-07-01T10:00:00Z'));

    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.body).toBe('first (edited)');
  });

  it('should keep the thread oldest first when a hub message arrives out of order', () => {
    const store = createStore([message('m2', 'second', '2026-07-01T10:01:00Z')]);

    hub.next(message('m1', 'first', '2026-07-01T10:00:00Z'));

    expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  // The API aggregates reactions server-side and sends `reactedByMe`; it never
  // sends reactor ids. The frontend model used to declare `memberIds`, so the
  // toggle read `undefined.includes(...)` — a guaranteed crash against the real
  // backend that every e2e missed, because the fixtures had been written from
  // the wrong model.
  it('should decide the reaction direction from reactedByMe', () => {
    const store = createStore([
      {
        ...message('m1', 'hello', '2026-07-01T10:00:00Z'),
        reactions: [{ emoji: '👍', count: 2, reactedByMe: true }],
      } as MessageOutput,
    ]);

    store.toggleReaction({ message: store.messages()[0] as MessageOutput, emoji: '👍' });

    // Already mine, so removing it: DELETE, and the count comes back down.
    expect(removeReaction).toHaveBeenCalledWith('m1', '👍');
    expect(addReaction).not.toHaveBeenCalled();
    expect(store.messages()[0]?.reactions[0]?.count).toBe(1);
    expect(store.messages()[0]?.reactions[0]?.reactedByMe).toBe(false);
  });

  // Risk R8: the hub appends without bound — a channel left open all day must
  // not grow the DOM linearly. The thread caps at 200, dropping the oldest.
  it('should cap the streamed thread at the message window', () => {
    const store = createStore([message('m0', 'seed', '2026-07-01T00:00:00Z')]);

    for (let index = 1; index <= 320; index += 1) {
      hub.next(
        message(
          `live-${String(index).padStart(3, '0')}`,
          `live ${index}`,
          `2026-07-01T10:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z`,
        ),
      );
    }

    const ids = store.messages().map((m) => m.id);
    expect(ids).toHaveLength(200);
    // Newest tail survives; the seed and the earliest live rows are gone.
    expect(ids.at(-1)).toBe('live-320');
    expect(ids).not.toContain('m0');
    expect(ids).not.toContain('live-120');
    expect(ids).toContain('live-121');
  });

  describe('scrollback', () => {
    const recent = message('m50', 'newest', '2026-07-01T10:00:00Z');
    const older = message('m1', 'oldest', '2026-06-01T10:00:00Z');

    it('offers scrollback only while history remains', () => {
      const complete = createStore([recent]);
      TestBed.tick();
      expect(complete.hasOlderMessages()).toBe(false);

      TestBed.resetTestingModule();
      const partial = createStore([recent], { total: 2, older: [older] });
      TestBed.tick();
      expect(partial.hasOlderMessages()).toBe(true);
    });

    it('prepends the previous page and stops offering more once complete', () => {
      const store = createStore([recent], { total: 2, older: [older] });
      TestBed.tick();

      store.loadOlderMessages();
      TestBed.tick();

      // Older first: the thread reads oldest to newest.
      expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm50']);
      expect(listMessages).toHaveBeenLastCalledWith('c1', { itemsPerPage: 50, page: 2 });
      expect(store.hasOlderMessages()).toBe(false);
    });

    it('does not fetch when everything is already loaded', () => {
      const store = createStore([recent]);
      TestBed.tick();
      const before = listMessages.mock.calls.length;

      store.loadOlderMessages();
      TestBed.tick();

      expect(listMessages.mock.calls.length).toBe(before);
    });
  });

  describe('presence', () => {
    it('announces this member as online, and keeps announcing', () => {
      vi.useFakeTimers();
      const store = createStore([]);
      TestBed.tick();

      store.publishPresence(true);
      // `timer(0, …)` still schedules a macrotask, so the clock has to move
      // before the first beat fires.
      vi.advanceTimersByTime(0);
      TestBed.tick();
      // Nothing published its own presence before this: the dot could only ever
      // appear for members using some other client.
      expect(pingPresence).toHaveBeenCalledTimes(1);

      // Well inside the server's 90s hold, so a dropped beat is not "left".
      vi.advanceTimersByTime(45_000);
      TestBed.tick();
      expect(pingPresence).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
