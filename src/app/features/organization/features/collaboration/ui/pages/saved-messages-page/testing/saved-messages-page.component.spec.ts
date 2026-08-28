import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  ConversationService,
  MessageService,
} from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { SavedMessagesPage } from '../saved-messages-page.component';

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

describe('SavedMessagesPage', () => {
  let fixture: ComponentFixture<SavedMessagesPage>;
  let service: {
    listSaved: ReturnType<typeof vi.fn>;
    unsaveMessage: ReturnType<typeof vi.fn>;
  };
  let conversations: { get: ReturnType<typeof vi.fn> };

  async function createPage(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MessageService, useValue: service },
        { provide: ConversationService, useValue: conversations },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal('org-1'),
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(SavedMessagesPage);
    await fixture.whenStable();
  }

  beforeEach(() => {
    service = {
      listSaved: vi.fn().mockReturnValue(
        of({
          '@id': '/api/saved-messages',
          '@type': 'Collection',
          totalItems: 1,
          member: [saved()],
        }),
      ),
      unsaveMessage: vi.fn().mockReturnValue(of(undefined)),
    };
    conversations = {
      get: vi.fn().mockReturnValue(
        of({
          '@id': '/api/conversations/conversation-1',
          '@type': 'Conversation',
          id: 'conversation-1',
          isChannel: true,
          name: 'Interventions',
        } as ConversationOutput),
      ),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the open organization bookmarks on arrival', async () => {
    await createPage();

    expect(service.listSaved).toHaveBeenCalledWith({
      organization: 'org-1',
      page: 1,
      itemsPerPage: 30,
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="saved-messages-list"]'),
    ).not.toBeNull();
  });

  it('should link a channel bookmark to the channel route, named after it', async () => {
    await createPage();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="saved-message-conversation-link"]',
    );

    expect(link?.textContent?.trim()).toBe('Interventions');
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/channels/conversation-1');
  });

  it('should fall back to the direct route when the conversation is unresolvable', async () => {
    conversations.get.mockReturnValue(
      of({
        '@id': '/api/conversations/conversation-1',
        '@type': 'Conversation',
        id: 'conversation-1',
        isChannel: false,
      } as ConversationOutput),
    );

    await createPage();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="saved-message-conversation-link"]',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/messages/conversation-1');
  });

  it('should withdraw a bookmark from its row', async () => {
    await createPage();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="saved-message-unsave"]')
      ?.click();
    await fixture.whenStable();

    expect(service.unsaveMessage).toHaveBeenCalledWith('message-1');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="saved-message-unsave"]'),
    ).toBeNull();
  });

  it('should show the empty state when nothing is saved', async () => {
    service.listSaved.mockReturnValue(
      of({ '@id': '/api/saved-messages', '@type': 'Collection', totalItems: 0, member: [] }),
    );

    await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nothing saved yet');
  });
});
