import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MessageService } from '@features/organization/features/collaboration/data-access';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { messageRepliesStoreEvents } from '../events';
import { MessageRepliesStore, type MessageRepliesStoreType } from '../message-replies.store';

function reply(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/reply-1',
    '@type': 'Message',
    id: 'reply-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Vu, je passe demain.',
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

function collection(
  member: readonly MessageOutput[],
  totalItems: number = member.length,
): HydraCollection<MessageOutput> {
  return {
    '@id': '/api/messages/message-1/replies',
    '@type': 'Collection',
    totalItems,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('MessageRepliesStore', () => {
  let service: {
    listReplies: ReturnType<typeof vi.fn>;
    postReply: ReturnType<typeof vi.fn>;
  };

  function createStore(): MessageRepliesStoreType {
    TestBed.configureTestingModule({
      providers: [MessageRepliesStore, { provide: MessageService, useValue: service }],
    });

    return TestBed.inject(MessageRepliesStore);
  }

  beforeEach(() => {
    service = {
      listReplies: vi.fn().mockReturnValue(of(collection([]))),
      postReply: vi.fn().mockReturnValue(of(reply())),
    };
  });

  it('should read a message’s replies and report the thread open', () => {
    service.listReplies.mockReturnValue(of(collection([reply()], 3)));

    const store = createStore();
    store.load({ parentMessageId: 'message-1' });

    expect(service.listReplies).toHaveBeenCalledWith('message-1', { page: 1 });
    expect(store.replyEntities()).toHaveLength(1);
    expect(store.total()).toBe(3);
    expect(store.hasMore()).toBe(true);
    expect(store.isOpen()).toBe(true);
  });

  it('should append a further page instead of replacing the first', () => {
    service.listReplies.mockReturnValue(of(collection([reply()], 2)));

    const store = createStore();
    store.load({ parentMessageId: 'message-1' });

    service.listReplies.mockReturnValue(of(collection([reply({ id: 'reply-2' })], 2)));
    store.load({ parentMessageId: 'message-1', page: 2 });

    expect(store.replyEntities().map((row: MessageOutput): string => row.id)).toEqual([
      'reply-1',
      'reply-2',
    ]);
    expect(store.hasMore()).toBe(false);
  });

  it('should merge a posted reply and announce its parent', () => {
    const store = createStore();
    const events = TestBed.inject(Events);
    let announced: string | null = null;

    events
      .on(messageRepliesStoreEvents.posted)
      .subscribe(({ payload }): void => void (announced = payload));

    store.load({ parentMessageId: 'message-1' });
    store.send({ parentMessageId: 'message-1', input: { body: 'Vu, je passe demain.' } });

    expect(service.postReply).toHaveBeenCalledWith('message-1', {
      body: 'Vu, je passe demain.',
    });
    expect(store.replyEntities()).toHaveLength(1);
    expect(store.total()).toBe(1);
    // The thread store bumps the parent's `replyCount` off this.
    expect(announced).toBe('message-1');
  });

  it('should surface a read failure without dropping the thread', () => {
    service.listReplies.mockReturnValue(throwError((): Error => new Error('nope')));

    const store = createStore();
    store.load({ parentMessageId: 'message-1' });

    expect(store.loadError()).not.toBeNull();
    expect(store.isOpen()).toBe(true);
  });

  it('should drop what was loaded when the thread closes', () => {
    service.listReplies.mockReturnValue(of(collection([reply()], 1)));

    const store = createStore();
    store.load({ parentMessageId: 'message-1' });
    store.close();

    // Reopening must not show the previous thread's replies while its own
    // first page is still in flight.
    expect(store.replyEntities()).toHaveLength(0);
    expect(store.total()).toBe(0);
    expect(store.isOpen()).toBe(false);
  });
});
