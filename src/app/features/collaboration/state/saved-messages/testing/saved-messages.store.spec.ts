import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MessageService } from '@features/collaboration/data-access';
import type { MessageOutput } from '@features/collaboration/models';
import { SavedMessagesStore, type SavedMessagesStoreType } from '../saved-messages.store';

const ORGANIZATION = '/api/organizations/org-1';

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
    isSaved: true,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

function collection(member: readonly MessageOutput[]): HydraCollection<MessageOutput> {
  return {
    '@id': '/api/saved-messages',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<MessageOutput>;
}

describe('SavedMessagesStore', () => {
  let service: {
    listSaved: ReturnType<typeof vi.fn>;
    unsave: ReturnType<typeof vi.fn>;
  };

  function createStore(): SavedMessagesStoreType {
    TestBed.configureTestingModule({
      providers: [SavedMessagesStore, { provide: MessageService, useValue: service }],
    });

    return TestBed.inject(SavedMessagesStore);
  }

  beforeEach(() => {
    service = { listSaved: vi.fn(), unsave: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should start empty', () => {
    const store = createStore();

    expect(store.savedEntities()).toHaveLength(0);
    expect(store.hasMore()).toBe(false);
  });

  it('should pass the organization through as an IRI', () => {
    service.listSaved.mockReturnValue(of(collection([message()])));

    createStore().load({ organization: ORGANIZATION });

    // This endpoint rejects the bare UUID form the others accept.
    expect(service.listSaved).toHaveBeenCalledWith({ organization: ORGANIZATION });
  });

  it('should drive hasMore from the server total, not the row count', () => {
    service.listSaved.mockReturnValue(of({ ...collection([message()]), totalItems: 12 }));

    const store = createStore();
    store.load({ organization: ORGANIZATION });

    expect(store.total()).toBe(12);
    expect(store.hasMore()).toBe(true);
  });

  it('should append further pages and replace on a reload', () => {
    service.listSaved.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 2 }));
    service.listSaved.mockReturnValueOnce(
      of({ ...collection([message({ id: 'message-2' })]), totalItems: 2 }),
    );
    service.listSaved.mockReturnValueOnce(of({ ...collection([message()]), totalItems: 1 }));

    const store = createStore();
    store.load({ organization: ORGANIZATION });
    store.load({ organization: ORGANIZATION, page: 2 });

    expect(store.savedEntities().map((row) => row.id)).toEqual(['message-1', 'message-2']);

    store.load({ organization: ORGANIZATION });

    expect(store.savedEntities().map((row) => row.id)).toEqual(['message-1']);
  });

  it('should drop the row and decrement the total when a bookmark is removed', () => {
    service.listSaved.mockReturnValue(
      of({ ...collection([message(), message({ id: 'message-2' })]), totalItems: 2 }),
    );
    // The 204 carries no body, so there is nothing to merge back.
    service.unsave.mockReturnValue(of(undefined));

    const store = createStore();
    store.load({ organization: ORGANIZATION });
    store.unsave('message-1');

    expect(store.savedEntities().map((row) => row.id)).toEqual(['message-2']);
    expect(store.total()).toBe(1);
  });

  it('should keep the loaded rows when unsaving fails', () => {
    service.listSaved.mockReturnValue(of(collection([message()])));
    service.unsave.mockReturnValue(throwError(() => new Error('nope')));

    const store = createStore();
    store.load({ organization: ORGANIZATION });
    store.unsave('message-1');

    expect(store.savedEntities()).toHaveLength(1);
    expect(store.total()).toBe(1);
  });

  it('should surface a load failure', () => {
    service.listSaved.mockReturnValue(throwError(() => new Error('nope')));

    const store = createStore();
    store.load({ organization: ORGANIZATION });

    expect(store.loadError()).toBeTruthy();
    expect(store.isLoading()).toBe(false);
  });
});
