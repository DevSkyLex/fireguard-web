import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  ConversationService,
  MessageService,
} from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import { SAVED_MESSAGES_PAGE_SIZE } from '../constants';
import { SavedMessagesStore, type SavedMessagesStoreType } from '../saved-messages.store';

function saved(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/message-1',
    '@type': 'Message',
    id: 'message-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    authorDisplayName: 'Amélie Rousseau',
    body: 'À garder.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: true,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

function conversation(overrides: Partial<ConversationOutput> = {}): ConversationOutput {
  return {
    '@id': '/api/conversations/conversation-1',
    '@type': 'Conversation',
    id: 'conversation-1',
    organization: '/api/organizations/org-1',
    subjectType: 'channel',
    visibility: 'private',
    messagesCount: 1,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    isChannel: true,
    name: 'Interventions',
    isFavorite: false,
    ...overrides,
  } as ConversationOutput;
}

function collection(
  member: readonly MessageOutput[],
  totalItems: number = member.length,
): HydraCollection<MessageOutput> {
  return {
    '@id': '/api/saved-messages',
    '@type': 'Collection',
    totalItems,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('SavedMessagesStore', () => {
  let service: {
    listSaved: ReturnType<typeof vi.fn>;
    unsaveMessage: ReturnType<typeof vi.fn>;
  };
  let conversations: { get: ReturnType<typeof vi.fn> };

  function createStore(): SavedMessagesStoreType {
    TestBed.configureTestingModule({
      providers: [
        SavedMessagesStore,
        { provide: MessageService, useValue: service },
        { provide: ConversationService, useValue: conversations },
      ],
    });

    return TestBed.inject(SavedMessagesStore);
  }

  beforeEach(() => {
    service = { listSaved: vi.fn(), unsaveMessage: vi.fn() };
    conversations = { get: vi.fn().mockReturnValue(of(conversation())) };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the first page scoped to the organization', () => {
    service.listSaved.mockReturnValue(of(collection([saved()])));

    const store = createStore();
    store.load('org-1');

    expect(service.listSaved).toHaveBeenCalledWith({
      organization: 'org-1',
      page: 1,
      itemsPerPage: SAVED_MESSAGES_PAGE_SIZE,
    });
    expect(store.savedMessageEntities()).toHaveLength(1);
    expect(store.hasMore()).toBe(false);
  });

  it('should resolve each distinct conversation once for routing', () => {
    service.listSaved.mockReturnValue(
      of(
        collection([
          saved(),
          saved({ id: 'message-2' }),
          saved({ id: 'message-3', conversation: '/api/conversations/conversation-2' }),
        ]),
      ),
    );
    conversations.get.mockImplementation((id: string) => of(conversation({ id })));

    const store = createStore();
    store.load('org-1');

    expect(conversations.get).toHaveBeenCalledTimes(2);
    expect(store.conversationsById()['conversation-1']).toBeDefined();
    expect(store.conversationsById()['conversation-2']).toBeDefined();
  });

  it('should keep the list usable when a conversation cannot be read', () => {
    service.listSaved.mockReturnValue(of(collection([saved()])));
    conversations.get.mockReturnValue(throwError(() => ({ status: 403 })));

    const store = createStore();
    store.load('org-1');

    expect(store.savedMessageEntities()).toHaveLength(1);
    expect(store.conversationsById()['conversation-1']).toBeUndefined();
    expect(store.loadError()).toBeNull();
  });

  it('should append the next page and report remaining pages honestly', () => {
    service.listSaved.mockReturnValueOnce(of(collection([saved()], 2)));
    service.listSaved.mockReturnValueOnce(of(collection([saved({ id: 'message-2' })], 2)));

    const store = createStore();
    store.load('org-1');
    expect(store.hasMore()).toBe(true);

    store.loadMore();
    expect(service.listSaved).toHaveBeenLastCalledWith({
      organization: 'org-1',
      page: 2,
      itemsPerPage: SAVED_MESSAGES_PAGE_SIZE,
    });
    expect(store.savedMessageEntities()).toHaveLength(2);
    expect(store.hasMore()).toBe(false);
  });

  it('should record a load failure', () => {
    service.listSaved.mockReturnValue(throwError(() => ({ status: 500 })));

    const store = createStore();
    store.load('org-1');

    expect(store.loadError()).not.toBeNull();
  });

  it('should drop an unsaved row and shrink the total', () => {
    service.listSaved.mockReturnValue(of(collection([saved()], 1)));
    service.unsaveMessage.mockReturnValue(of(undefined));

    const store = createStore();
    store.load('org-1');
    store.unsave('message-1');

    expect(service.unsaveMessage).toHaveBeenCalledWith('message-1');
    expect(store.savedMessageEntities()).toHaveLength(0);
    expect(store.hasMore()).toBe(false);
  });

  it('should keep the row when the unsave fails', () => {
    service.listSaved.mockReturnValue(of(collection([saved()], 1)));
    service.unsaveMessage.mockReturnValue(throwError(() => ({ status: 500 })));

    const store = createStore();
    store.load('org-1');
    store.unsave('message-1');

    expect(store.savedMessageEntities()).toHaveLength(1);
  });
});
