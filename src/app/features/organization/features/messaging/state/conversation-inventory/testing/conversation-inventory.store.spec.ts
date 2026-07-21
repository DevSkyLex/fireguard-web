import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type {
  ChannelOutput,
  ConversationOutput,
} from '@features/organization/features/messaging/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { ConversationInventoryStore } from '../conversation-inventory.store';

/** A row as `GET /api/channels` sends it — NOT a `ConversationOutput`. */
const channel = (id: string, overrides: Partial<ChannelOutput> = {}): ChannelOutput =>
  ({
    '@id': `/api/channels/${id}`,
    '@type': 'Channel',
    id,
    organization: '/api/organizations/org-1',
    name: id,
    team: null,
    createdByMember: null,
    participantCount: 1,
    isArchived: false,
    lastMessageAt: null,
    messagesCount: 0,
    unreadCount: 0,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    isFavorite: false,
    parent: null,
    ...overrides,
  }) as ChannelOutput;

const conversation = (
  id: string,
  overrides: Partial<ConversationOutput> = {},
): ConversationOutput =>
  ({
    '@id': `/api/conversations/${id}`,
    '@type': 'Conversation',
    id,
    organization: '/api/organizations/org-1',
    subjectType: 'direct',
    subject: null,
    subjectLabel: null,
    visibility: 'participants',
    lastMessageAt: null,
    messagesCount: 0,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    isChannel: false,
    name: null,
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
  let listChannels: ReturnType<typeof vi.fn>;
  let listDirectConversations: ReturnType<typeof vi.fn>;
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
            listChannels,
            listDirectConversations,
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
    // Channels come from `/api/channels` and ONLY from there: the backend
    // excludes them from `/api/conversations` by design.
    listChannels = vi.fn(() =>
      of({
        member: [
          channel('general', { unreadCount: 3 }),
          channel('ops', { isFavorite: true, parent: '/api/channels/general' }),
        ],
        totalItems: 2,
      }),
    );
    // Direct threads have their own endpoint too, for the same reason.
    listDirectConversations = vi.fn(() => of({ member: [], totalItems: 0 }));
    // Record-bound subject threads only.
    listConversations = vi.fn(() => of({ member: [], totalItems: 0 }));
    setFavorite = vi.fn(() => of(undefined));
    markRead = vi.fn((id: string) => of(conversation(id, { unreadCount: 0 })));
    // A ChannelOutput, deliberately not shaped like a ConversationOutput.
    createChannel = vi.fn(() => of(channel('site-inspections')));
    openDirectConversation = vi.fn(() => of(conversation('amelie')));
  });

  describe('loading the inventory', () => {
    it('should list channels AND conversations, and normalize channels into the list', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      expect(listChannels).toHaveBeenCalledWith('org-1', { itemsPerPage: 100 });
      expect(listConversations).toHaveBeenCalledWith('org-1', { itemsPerPage: 100 });
      expect(store.channels().map((c) => c.id)).toEqual(['general', 'ops']);
      // The channel payload's `parent` IRI becomes a bare id, which is what the
      // sidebar's tree matches on.
      expect(store.channels()[1]?.parentConversationId).toBe('general');
      expect(store.channels()[1]?.isChannel).toBe(true);
      expect(store.channels()[1]?.subjectType).toBe('channel');
      expect(store.favorites().map((c) => c.id)).toEqual(['ops']);
      expect(store.totalUnread()).toBe(3);
    });

    it('should keep the inventory empty when the channel list fails', () => {
      listChannels = vi.fn(() => throwError(() => new Error('nope')));
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      expect(store.conversations()).toEqual([]);
    });

    it('should stay idle without the messaging permission', () => {
      permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      expect(listChannels).not.toHaveBeenCalled();
      expect(store.conversations()).toEqual([]);
    });

    it('should honour a namespace wildcard grant', () => {
      permissions.set(['organization.messaging.*']);
      configure();
      TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      expect(listChannels).toHaveBeenCalledTimes(1);
    });
  });

  describe('opening a conversation', () => {
    it('creates a channel, then refetches the list rather than folding the answer in', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();
      expect(listChannels).toHaveBeenCalledTimes(1);

      store.createChannel({ organizationId: 'org-1', name: 'site-inspections' });
      TestBed.tick();

      expect(createChannel).toHaveBeenCalledWith('org-1', 'site-inspections');
      expect(listChannels).toHaveBeenCalledTimes(2);
      expect(store.openedConversationId()).toBe('site-inspections');
    });

    it('keeps an opened direct conversation in the sidebar, since no endpoint lists them', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();
      expect(store.directConversations()).toEqual([]);

      store.openDirectConversation({ organizationId: 'org-1', memberId: 'member-1' });
      TestBed.tick();

      expect(openDirectConversation).toHaveBeenCalledWith('org-1', 'member-1');
      expect(store.openedConversationId()).toBe('amelie');
      // The reload that follows returns nothing for it — it must survive anyway.
      expect(store.directConversations().map((c) => c.id)).toEqual(['amelie']);
    });

    it('does not duplicate a direct conversation reopened twice', () => {
      configure();
      const store = TestBed.inject(ConversationInventoryStore);
      TestBed.tick();

      store.openDirectConversation({ organizationId: 'org-1', memberId: 'member-1' });
      TestBed.tick();
      store.openDirectConversation({ organizationId: 'org-1', memberId: 'member-1' });
      TestBed.tick();

      expect(store.directConversations()).toHaveLength(1);
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
      expect(listChannels).toHaveBeenCalledTimes(1);
      expect(store.channels().map((c) => c.id)).toEqual(['general', 'ops']);
    });
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

  it('should clear the unread count of a session-only direct conversation', () => {
    openDirectConversation = vi.fn(() => of(conversation('amelie', { unreadCount: 2 })));
    markRead = vi.fn(() => of());
    configure();
    const store = TestBed.inject(ConversationInventoryStore);
    TestBed.tick();

    store.openDirectConversation({ organizationId: 'org-1', memberId: 'member-1' });
    TestBed.tick();
    store.markRead('amelie');

    expect(store.directConversations()[0]?.unreadCount).toBe(0);
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

    const favorite = store.favorites()[0] as ConversationOutput;
    store.toggleFavorite(favorite);

    expect(setFavorite).toHaveBeenCalledWith('ops', false);
    expect(store.favorites()).toEqual([]);
  });
});
