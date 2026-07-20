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
  let createChannel: ReturnType<typeof vi.fn>;
  let openDirectConversation: ReturnType<typeof vi.fn>;

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        ConversationInventoryStore,
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization } },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
        {
          provide: MessagingService,
          useValue: {
            listConversations,
            setFavorite,
            markRead,
            createChannel,
            openDirectConversation,
          },
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
    // A ChannelOutput, deliberately not shaped like a ConversationOutput: it
    // carries participantCount/parent and lacks isChannel/visibility.
    createChannel = vi.fn(() =>
      of({
        '@id': '/api/channels/site-inspections',
        '@type': 'Channel',
        id: 'site-inspections',
        organization: '/api/organizations/org-1',
        name: 'site-inspections',
        team: null,
        createdByMember: null,
        participantCount: 1,
        isArchived: false,
        lastMessageAt: null,
        messagesCount: 0,
        unreadCount: 0,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
        isFavorite: false,
        parent: null,
      }),
    );
    openDirectConversation = vi.fn(() =>
      of(conversation('amelie', { isChannel: false, name: null, visibility: 'direct' })),
    );
  });

  describe('opening a conversation', () => {
    it('creates a channel, then refetches the list rather than folding the answer in', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();
      expect(listConversations).toHaveBeenCalledTimes(1);

      store.createChannel({ organizationId: 'org-1', name: 'site-inspections' });
      TestBed.tick();

      expect(createChannel).toHaveBeenCalledWith('org-1', 'site-inspections');
      // The list is reloaded: a ChannelOutput cannot be pushed into a
      // ConversationOutput list without inventing the missing fields.
      expect(listConversations).toHaveBeenCalledTimes(2);
      expect(store.openedConversationId()).toBe('site-inspections');
    });

    it('opens a direct conversation and exposes its id for navigation', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      store.openDirectConversation({ organizationId: 'org-1', memberId: 'member-1' });
      TestBed.tick();

      expect(openDirectConversation).toHaveBeenCalledWith('org-1', 'member-1');
      expect(store.openedConversationId()).toBe('amelie');
    });

    it('clears the one-shot result so the next success is a real transition', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      store.createChannel({ organizationId: 'org-1', name: 'site-inspections' });
      TestBed.tick();
      store.clearOpenedConversation();

      expect(store.openedConversationId()).toBeNull();
    });

    it('reports a failed create without touching the list', () => {
      createChannel = vi.fn(() => throwError(() => new Error('nope')));
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      store.createChannel({ organizationId: 'org-1', name: 'x' });
      TestBed.tick();

      expect(store.openedConversationId()).toBeNull();
      expect(listConversations).toHaveBeenCalledTimes(1);
      expect(store.channels().map((c) => c.id)).toEqual(['general']);
    });
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
