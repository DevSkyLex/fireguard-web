import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MessageService } from '@features/organization/features/collaboration/data-access';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { REPLY_PAGE_SIZE } from '../constants';
import { messageRepliesStoreEvents } from '../events';
import { MessageRepliesStore, type MessageRepliesStoreType } from '../message-replies.store';

function reply(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/reply-1',
    '@type': 'Message',
    id: 'reply-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Réponse.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

function collection(member: readonly MessageOutput[]): HydraCollection<MessageOutput> {
  return {
    '@id': '/api/messages/parent-1/replies',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('MessageRepliesStore', () => {
  let service: {
    listReplies: ReturnType<typeof vi.fn>;
    postReply: ReturnType<typeof vi.fn>;
  };
  let dispatched: { type: string }[];

  function createStore(): MessageRepliesStoreType {
    TestBed.configureTestingModule({
      providers: [MessageRepliesStore, { provide: MessageService, useValue: service }],
    });

    const store = TestBed.inject(MessageRepliesStore);

    TestBed.runInInjectionContext(() => {
      inject(Events)
        .on(
          messageRepliesStoreEvents.replyPosted,
          messageRepliesStoreEvents.replyFailed,
          messageRepliesStoreEvents.loadFailed,
        )
        .subscribe((event: { type: string }): void => {
          dispatched.push(event);
        });
    });

    return store;
  }

  beforeEach(() => {
    dispatched = [];
    service = { listReplies: vi.fn(), postReply: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load a parent thread at the reply page size, oldest first', () => {
    service.listReplies.mockReturnValue(
      of(
        collection([
          reply({ id: 'b', createdAt: '2026-01-02T00:00:00+00:00' }),
          reply({ id: 'a', createdAt: '2026-01-01T00:00:00+00:00' }),
        ]),
      ),
    );

    const store = createStore();
    store.load('parent-1');

    expect(service.listReplies).toHaveBeenCalledWith('parent-1', {
      page: 1,
      itemsPerPage: REPLY_PAGE_SIZE,
    });
    expect(store.parentMessageId()).toBe('parent-1');
    expect(store.sortedReplies().map((row) => row.id)).toEqual(['a', 'b']);
    expect(store.isLoading()).toBe(false);
  });

  it('should record a load failure and announce it', () => {
    service.listReplies.mockReturnValue(throwError(() => ({ status: 500 })));

    const store = createStore();
    store.load('parent-1');

    expect(store.loadError()).not.toBeNull();
    expect(
      dispatched.some((event) => event.type === messageRepliesStoreEvents.loadFailed.type),
    ).toBe(true);
  });

  it('should append a posted reply and announce the parent', () => {
    service.listReplies.mockReturnValue(of(collection([])));
    service.postReply.mockReturnValue(of(reply({ id: 'reply-new' })));

    const store = createStore();
    store.load('parent-1');
    store.reply({ parentMessageId: 'parent-1', input: { body: 'Réponse.' } });

    expect(service.postReply).toHaveBeenCalledWith('parent-1', { body: 'Réponse.' });
    expect(store.sortedReplies().map((row) => row.id)).toEqual(['reply-new']);
    expect(store.total()).toBe(1);
    expect(
      dispatched.some((event) => event.type === messageRepliesStoreEvents.replyPosted.type),
    ).toBe(true);
  });

  it('should keep a post failure on the post call state and announce it', () => {
    service.listReplies.mockReturnValue(of(collection([])));
    service.postReply.mockReturnValue(throwError(() => ({ status: 422 })));

    const store = createStore();
    store.load('parent-1');
    store.reply({ parentMessageId: 'parent-1', input: { body: '' } });

    expect(store.postError()).not.toBeNull();
    expect(store.sortedReplies()).toHaveLength(0);
    expect(
      dispatched.some((event) => event.type === messageRepliesStoreEvents.replyFailed.type),
    ).toBe(true);
  });

  it('should not fold a reply into a thread opened for another parent', () => {
    service.listReplies.mockReturnValue(of(collection([])));
    service.postReply.mockReturnValue(of(reply({ id: 'reply-late' })));

    const store = createStore();
    store.load('parent-2');
    store.reply({ parentMessageId: 'parent-1', input: { body: 'Réponse.' } });

    expect(store.sortedReplies()).toHaveLength(0);
    expect(
      dispatched.some((event) => event.type === messageRepliesStoreEvents.replyPosted.type),
    ).toBe(true);
  });

  it('should reset to its initial state', () => {
    service.listReplies.mockReturnValue(of(collection([reply()])));

    const store = createStore();
    store.load('parent-1');
    store.reset();

    expect(store.parentMessageId()).toBeNull();
    expect(store.sortedReplies()).toHaveLength(0);
    expect(store.total()).toBe(0);
  });
});
