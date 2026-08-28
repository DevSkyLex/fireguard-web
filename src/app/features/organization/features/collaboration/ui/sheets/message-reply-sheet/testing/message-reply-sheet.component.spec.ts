import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from '@features/organization/features/collaboration/data-access';
import type {
  MessageOutput,
  MessageView,
} from '@features/organization/features/collaboration/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { MessageReplySheet } from '../message-reply-sheet.component';

function parentView(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: 'parent-1',
    authorId: 'member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Sujet.</p>',
    createdAt: '2026-01-01T09:00:00+00:00',
    isDeleted: false,
    isOwn: false,
    status: 'sent',
    isPinned: false,
    isSaved: false,
    replyCount: 1,
    canEdit: false,
    canDelete: false,
    reactions: [],
    ...overrides,
  };
}

function reply(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/reply-1',
    '@type': 'Message',
    id: 'reply-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-2',
    authorDisplayName: 'Jean Dupont',
    body: 'Réponse.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T10:00:00+00:00',
    updatedAt: '2026-01-01T10:00:00+00:00',
    ...overrides,
  };
}

const sheet = (): HTMLElement | null =>
  document.querySelector('[data-testid="message-reply-sheet"]');

describe('MessageReplySheet', () => {
  let fixture: ComponentFixture<MessageReplySheet>;
  let service: {
    listReplies: ReturnType<typeof vi.fn>;
    postReply: ReturnType<typeof vi.fn>;
  };
  let posted: string[];

  async function open(parent: MessageView = parentView()): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MessageService, useValue: service },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: signal(new Map()),
            isAvailable: signal(false),
            isLoading: signal(false),
            ensureLoaded: vi.fn(),
            displayNameFor: (value: string): string => value,
          },
        },
        {
          provide: ORGANIZATION_MEMBER_ACCESS_PORT,
          useValue: {
            profile: signal({ id: 'member-1', organizationId: 'org-1' }),
            roles: signal([]),
            permissions: signal([]),
            isLoadingAccess: signal(false),
            accessError: signal(null),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(MessageReplySheet);
    posted = [];
    fixture.componentInstance.replyPosted.subscribe((id: string) => posted.push(id));
    fixture.componentRef.setInput('parent', parent);
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  }

  beforeEach(() => {
    service = {
      listReplies: vi.fn().mockReturnValue(
        of({
          '@id': '/api/messages/parent-1/replies',
          '@type': 'Collection',
          totalItems: 1,
          member: [reply()],
        }),
      ),
      postReply: vi.fn(),
    };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the parent thread when it opens, and render its replies', async () => {
    await open();

    expect(service.listReplies).toHaveBeenCalledWith('parent-1', {
      page: 1,
      itemsPerPage: 100,
    });
    expect(sheet()?.textContent).toContain('Réponse.');
  });

  it('should post a reply under the open parent and relay the count bump', async () => {
    service.postReply.mockReturnValue(of(reply({ id: 'reply-2' })));

    await open();
    fixture.componentInstance['send']('Bien noté.');
    await fixture.whenStable();

    expect(service.postReply).toHaveBeenCalledWith('parent-1', { body: 'Bien noté.' });
    expect(posted).toEqual(['parent-1']);
  });

  it('should not reload when reopened on the same parent', async () => {
    await open();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(service.listReplies).toHaveBeenCalledTimes(1);
  });
});
