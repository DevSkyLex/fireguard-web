import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import {
  OrganizationMemberAccessStore,
  OrganizationMemberDirectoryStore,
} from '@features/organization/state';
import { MessagingSidebar } from '../messaging-sidebar.component';
import { buildChannelTree } from '../utils/channel-tree.utils';

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
    visibility: 'participants',
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

describe('MessagingSidebar', () => {
  const rows = [
    conversation('general', { unreadCount: 3 }),
    conversation('batiment-nord', { name: 'Bâtiment Nord' }),
    conversation('extincteurs-rdc', {
      name: 'Extincteurs — RDC',
      parentConversationId: 'batiment-nord',
    }),
    conversation('amelie', {
      isChannel: false,
      subjectType: 'direct',
      name: null,
      subjectLabel: 'Amélie Rivet',
      isFavorite: true,
    }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessagingSidebar],
      providers: [
        ConversationInventoryStore,
        provideRouter([]),
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization: signal(ORG) } },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            permissions: signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.MESSAGING_READ]),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            // Channels reach the inventory through `/api/channels`; this spec
            // feeds them all through the conversation list because the store
            // simply concatenates the two sources.
            listChannels: vi.fn(() => of({ member: [], totalItems: 0 })),
            listDirectConversations: vi.fn(() => of({ member: [], totalItems: 0 })),
            listConversations: vi.fn(() => of({ member: rows, totalItems: rows.length })),
            markRead: vi.fn(() => of()),
            setFavorite: vi.fn(() => of(undefined)),
            createChannel: vi.fn(() => of()),
            openDirectConversation: vi.fn(() => of()),
          },
        },
        // Doubled rather than real: the concrete stores reach HydraApiService,
        // which the sidebar has no business pulling into a rendering spec.
        {
          provide: OrganizationMemberDirectoryStore,
          useValue: {
            identities: signal(new Map()),
            isQueryLoading: signal(false),
            load: vi.fn(),
          },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { currentMemberId: signal<string | null>(null) },
        },
      ],
    });
  });

  it('should render favorites and the channel hierarchy', () => {
    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const favorites = fixture.debugElement.query(
      By.css('[data-testid="messaging-sidebar-favorites"]'),
    );
    expect(favorites.nativeElement.textContent).toContain('Amélie Rivet');

    const channels = fixture.debugElement.query(
      By.css('[data-testid="messaging-sidebar-channels"]'),
    );
    // The parented channel renders inside its parent's nested list.
    const nested = channels.query(By.css('ul'));
    expect(nested.nativeElement.textContent).toContain('Extincteurs — RDC');
  });

  it('should badge unread conversations and deep link every row', () => {
    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const unread = fixture.debugElement.query(By.css('[data-testid="messaging-sidebar-unread"]'));
    expect(unread.nativeElement.textContent.trim()).toBe('3');

    const row = fixture.debugElement.query(By.css('[data-conversation-id="general"]'));
    expect(row.nativeElement.getAttribute('href')).toBe(
      '/organizations/org-1/messages?conversation=general',
    );
  });

  it('should highlight the conversation the URL opens', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?conversation=general');

    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const row = fixture.debugElement.query(By.css('[data-conversation-id="general"]'));
    expect(row.nativeElement.getAttribute('aria-current')).toBe('page');
  });

  it('should filter both sections through the channel search', () => {
    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const input = fixture.debugElement.query(
      By.css('[data-testid="messaging-sidebar-search"]'),
    ).nativeElement;
    input.value = 'extinc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const labels = fixture.debugElement
      .queryAll(By.css('[data-testid="messaging-sidebar-row"]'))
      .map((row) => row.nativeElement.textContent.trim());

    // The favorite does not match; the child channel does and is promoted to
    // a root because its parent is filtered out. The leading hash is the
    // channel glyph.
    expect(labels).toEqual(['#Extincteurs — RDC']);
  });

  it('folds one parent channel without touching the whole section', () => {
    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const nested = (): string =>
      fixture.debugElement.query(By.css('[data-testid="messaging-sidebar-channels"]')).nativeElement
        .textContent;

    expect(nested()).toContain('Extincteurs — RDC');

    fixture.debugElement
      .query(By.css('[data-testid="messaging-sidebar-fold-batiment-nord"]'))
      .nativeElement.click();
    fixture.detectChanges();

    // The child is gone, the parent and its siblings stay.
    expect(nested()).not.toContain('Extincteurs — RDC');
    expect(nested()).toContain('Bâtiment Nord');
    expect(nested()).toContain('general');
  });

  it('offers both "+" even when the workspace has no conversation at all', () => {
    // The headers used to live inside their list's `@if`, so an empty
    // workspace could never create its first channel.
    TestBed.overrideProvider(MessagingService, {
      useValue: {
        listChannels: vi.fn(() => of({ member: [], totalItems: 0 })),
        listDirectConversations: vi.fn(() => of({ member: [], totalItems: 0 })),
        listConversations: vi.fn(() => of({ member: [], totalItems: 0 })),
        markRead: vi.fn(() => of()),
        setFavorite: vi.fn(() => of(undefined)),
        createChannel: vi.fn(() => of()),
        openDirectConversation: vi.fn(() => of()),
      },
    });

    const fixture = TestBed.createComponent(MessagingSidebar);
    fixture.detectChanges();

    const at = (id: string): unknown => fixture.debugElement.query(By.css(`[data-testid="${id}"]`));

    expect(at('messaging-sidebar-new-channel')).not.toBeNull();
    expect(at('messaging-sidebar-new-direct')).not.toBeNull();
  });
});

describe('buildChannelTree', () => {
  it('should promote a child whose parent is not visible', () => {
    const orphan = conversation('leaf', { parentConversationId: 'missing-parent' });

    const tree = buildChannelTree([orphan]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.conversation.id).toBe('leaf');
    expect(tree[0]?.children).toEqual([]);
  });
});
