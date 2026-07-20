import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ConversationInventoryStore } from '../conversation-inventory.store';

const conversation = (
  id: string,
  overrides: Partial<ConversationOutput> = {},
): ConversationOutput =>
  ({
    '@id': `/api/conversations/${id}`,
    '@type': 'Conversation',
    id,
    organization: '/api/organizations/org-1',
    subjectType: 'channel',
    subject: null,
    subjectLabel: null,
    visibility: 'public',
    lastMessageAt: null,
    messagesCount: 0,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    isChannel: true,
    name: id,
    team: null,
    isFavorite: false,
    parentConversationId: null,
    ...overrides,
  }) as ConversationOutput;

const ORG = {
  id: 'org-1',
  name: 'Acme',
  slug: 'acme',
  status: 'active',
  isActive: true,
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

describe('ConversationInventoryStore', () => {
  let selectedOrganization: WritableSignal<typeof ORG | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let listConversations: ReturnType<typeof vi.fn>;
  let setFavorite: ReturnType<typeof vi.fn>;
  let markRead: ReturnType<typeof vi.fn>;

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        ConversationInventoryStore,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization } },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
        {
          provide: MessagingService,
          useValue: { listConversations, setFavorite, markRead },
        },
      ],
    });
  };

  beforeEach(() => {
    selectedOrganization = signal<typeof ORG | null>(ORG);
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    listConversations = vi.fn(() =>
      of({
        member: [
          conversation('general', { unreadCount: 3 }),
          conversation('amelie', { isChannel: false, name: null, isFavorite: true }),
        ],
        totalItems: 2,
      }),
    );
    setFavorite = vi.fn(() => of(undefined));
    markRead = vi.fn((id: string) => of(conversation(id, { unreadCount: 0 })));
  });

  it('should load the list for a member holding messaging.read', () => {
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    expect(listConversations).toHaveBeenCalledTimes(1);
    // The backend requires the organization filter; the store must pass the
    // workspace it is watching.
    expect(listConversations).toHaveBeenCalledWith('org-1', { itemsPerPage: 100 });
    expect(store.channels().map((c) => c.id)).toEqual(['general']);
    expect(store.directConversations().map((c) => c.id)).toEqual(['amelie']);
    expect(store.favorites().map((c) => c.id)).toEqual(['amelie']);
  });

  it('should stay idle without the messaging permission', () => {
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    expect(listConversations).not.toHaveBeenCalled();
    expect(store.conversations()).toEqual([]);
  });

  it('should honour a namespace wildcard grant', () => {
    permissions.set(['organization.messaging.*']);
    configure();
    TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    expect(listConversations).toHaveBeenCalledTimes(1);
  });

  it('should zero the unread count locally before the server confirms', () => {
    // The server call is left pending: the badge must not wait for it.
    markRead = vi.fn(() => of());
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    store.markRead('general');

    expect(store.channels()[0]?.unreadCount).toBe(0);
    expect(markRead).toHaveBeenCalledWith('general');
  });

  it('should flip a favorite optimistically and revert on failure', () => {
    setFavorite = vi.fn(() => throwError(() => new Error('nope')));
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    const general = store.channels()[0] as ConversationOutput;
    store.toggleFavorite(general);

    // The API refused: the flag must be back where it started.
    expect(store.channels()[0]?.isFavorite).toBe(false);
    expect(setFavorite).toHaveBeenCalledWith('general', true);
  });

  it('should keep the optimistic flip when unfavoriting returns no body', () => {
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    const favorite = store.directConversations()[0] as ConversationOutput;
    store.toggleFavorite(favorite);

    expect(setFavorite).toHaveBeenCalledWith('amelie', false);
    expect(store.favorites()).toEqual([]);
  });
});
