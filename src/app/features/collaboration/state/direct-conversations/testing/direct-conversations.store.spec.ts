import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { isCallError, isCallSuccess } from '@core/request-state';
import { ConversationService } from '@features/collaboration/data-access';
import type { ConversationOutput } from '@features/collaboration/models';
import {
  DirectConversationsStore,
  type DirectConversationsStoreType,
} from '../direct-conversations.store';

function conversation(overrides: Partial<ConversationOutput> = {}): ConversationOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ConversationOutput',
    id: 'dc-1',
    organization: '/api/organizations/org-1',
    subjectType: 'direct',
    visibility: 'participants',
    messagesCount: 5,
    isArchived: false,
    unreadCount: 2,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isChannel: false,
    isFavorite: false,
    counterpartMember: '/api/organizations/org-1/members/member-9',
    ...overrides,
  };
}

function collection(member: readonly ConversationOutput[]): HydraCollection<ConversationOutput> {
  return {
    '@id': '/api/direct-conversations',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<ConversationOutput>;
}

describe('DirectConversationsStore', () => {
  let service: {
    listDirectConversations: ReturnType<typeof vi.fn>;
    openDirectConversation: ReturnType<typeof vi.fn>;
  };

  function createStore(): DirectConversationsStoreType {
    TestBed.configureTestingModule({
      providers: [DirectConversationsStore, { provide: ConversationService, useValue: service }],
    });

    return TestBed.inject(DirectConversationsStore);
  }

  const query = { organization: '/api/organizations/org-1' };

  beforeEach(() => {
    service = {
      listDirectConversations: vi.fn(),
      openDirectConversation: vi.fn(),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should start idle and empty', () => {
    const store = createStore();

    expect(store.directConversationEntities()).toHaveLength(0);
    expect(store.isLoading()).toBe(false);
    expect(store.rows()).toHaveLength(0);
  });

  it('should load direct conversations', () => {
    service.listDirectConversations.mockReturnValue(of(collection([conversation()])));

    const store = createStore();
    store.load(query);

    expect(store.directConversationIds()).toEqual(['dc-1']);
    expect(store.total()).toBe(1);
    expect(isCallSuccess(store.listCallState())).toBe(true);
    expect(store.organizationId()).toBe('/api/organizations/org-1');
  });

  it('should sort rows most recently active first', () => {
    service.listDirectConversations.mockReturnValue(
      of(
        collection([
          conversation({ id: 'older', lastMessageAt: '2026-01-01T00:00:00+00:00' }),
          conversation({ id: 'newer', lastMessageAt: '2026-02-01T00:00:00+00:00' }),
        ]),
      ),
    );

    const store = createStore();
    store.load(query);

    expect(store.rows().map((row) => row.id)).toEqual(['newer', 'older']);
  });

  it('should surface a load failure', () => {
    service.listDirectConversations.mockReturnValue(throwError(() => new Error('boom')));

    const store = createStore();
    store.load(query);

    expect(isCallError(store.listCallState())).toBe(true);
    expect(store.loadError()).toBeTruthy();
  });

  it('should expose the counterpart for a loaded conversation', () => {
    service.listDirectConversations.mockReturnValue(of(collection([conversation()])));

    const store = createStore();
    store.load(query);

    expect(store.counterpartFor('dc-1')).toBe('/api/organizations/org-1/members/member-9');
    expect(store.counterpartFor('absent')).toBeUndefined();
  });

  it('should reload the list after opening so the counterpart resolves', () => {
    // The create response carries no counterpart; the row only becomes labelled
    // after the follow-up list reload.
    service.openDirectConversation.mockReturnValue(
      of(conversation({ id: 'dc-2', counterpartMember: undefined })),
    );
    service.listDirectConversations.mockReturnValue(of(collection([conversation({ id: 'dc-2' })])));

    const store = createStore();
    store.load(query);
    store.open({ organization: '/api/organizations/org-1', memberId: 'member-9' });

    expect(isCallSuccess(store.openCallState())).toBe(true);
    expect(store.counterpartFor('dc-2')).toBe('/api/organizations/org-1/members/member-9');
  });

  it('should surface an open failure without touching the list', () => {
    service.listDirectConversations.mockReturnValue(of(collection([conversation()])));
    service.openDirectConversation.mockReturnValue(throwError(() => new Error('nope')));

    const store = createStore();
    store.load(query);
    store.open({ organization: '/api/organizations/org-1', memberId: 'member-9' });

    expect(isCallError(store.openCallState())).toBe(true);
    expect(store.directConversationIds()).toEqual(['dc-1']);
  });

  it('should not reload when ensureLoaded targets the already-loaded organization', () => {
    service.listDirectConversations.mockReturnValue(of(collection([conversation()])));

    const store = createStore();
    store.load(query);
    expect(service.listDirectConversations).toHaveBeenCalledTimes(1);

    store.ensureLoaded('/api/organizations/org-1');
    expect(service.listDirectConversations).toHaveBeenCalledTimes(1);

    store.ensureLoaded('/api/organizations/org-2');
    expect(service.listDirectConversations).toHaveBeenCalledTimes(2);
  });
});
