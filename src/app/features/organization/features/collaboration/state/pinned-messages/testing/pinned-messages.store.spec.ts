import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MessageService } from '@features/organization/features/collaboration/data-access';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { PINNED_PAGE_SIZE } from '../constants';
import { PinnedMessagesStore, type PinnedMessagesStoreType } from '../pinned-messages.store';

function pinned(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/message-1',
    '@type': 'Message',
    id: 'message-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Consigne importante.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    pinnedAt: '2026-01-02T00:00:00+00:00',
    pinnedBy: '/api/organizations/org-1/members/member-1',
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
    '@id': '/api/conversations/conversation-1/pinned-messages',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('PinnedMessagesStore', () => {
  let service: {
    listPinned: ReturnType<typeof vi.fn>;
    unpinMessage: ReturnType<typeof vi.fn>;
  };

  function createStore(): PinnedMessagesStoreType {
    TestBed.configureTestingModule({
      providers: [PinnedMessagesStore, { provide: MessageService, useValue: service }],
    });

    return TestBed.inject(PinnedMessagesStore);
  }

  beforeEach(() => {
    service = { listPinned: vi.fn(), unpinMessage: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load a conversation pins at the cap, newest first', () => {
    service.listPinned.mockReturnValue(
      of(
        collection([
          pinned({ id: 'older', createdAt: '2026-01-01T00:00:00+00:00' }),
          pinned({ id: 'newer', createdAt: '2026-01-03T00:00:00+00:00' }),
        ]),
      ),
    );

    const store = createStore();
    store.load('conversation-1');

    expect(service.listPinned).toHaveBeenCalledWith('conversation-1', {
      page: 1,
      itemsPerPage: PINNED_PAGE_SIZE,
    });
    expect(store.sortedPins().map((row) => row.id)).toEqual(['newer', 'older']);
  });

  it('should record a load failure', () => {
    service.listPinned.mockReturnValue(throwError(() => ({ status: 500 })));

    const store = createStore();
    store.load('conversation-1');

    expect(store.loadError()).not.toBeNull();
  });

  it('should drop an unpinned row on success', () => {
    service.listPinned.mockReturnValue(of(collection([pinned()])));
    service.unpinMessage.mockReturnValue(of(undefined));

    const store = createStore();
    store.load('conversation-1');
    store.unpin('message-1');

    expect(service.unpinMessage).toHaveBeenCalledWith('message-1');
    expect(store.sortedPins()).toHaveLength(0);
    expect(store.total()).toBe(0);
  });

  it('should keep the row when the unpin fails', () => {
    service.listPinned.mockReturnValue(of(collection([pinned()])));
    service.unpinMessage.mockReturnValue(throwError(() => ({ status: 403 })));

    const store = createStore();
    store.load('conversation-1');
    store.unpin('message-1');

    expect(store.sortedPins()).toHaveLength(1);
  });

  it('should reset to its initial state', () => {
    service.listPinned.mockReturnValue(of(collection([pinned()])));

    const store = createStore();
    store.load('conversation-1');
    store.reset();

    expect(store.conversationId()).toBeNull();
    expect(store.sortedPins()).toHaveLength(0);
  });
});
