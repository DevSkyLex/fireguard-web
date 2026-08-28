import type {
  BuildMessageViewsInput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { buildMessageViews } from '../build-message-views.utils';

function message(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/message-1',
    '@type': 'Message',
    id: 'message-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Hello',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseInput(overrides: Partial<BuildMessageViewsInput> = {}): BuildMessageViewsInput {
  return {
    messages: [message()],
    pendingMessageIds: [],
    failedMessageIds: [],
    ownMemberIri: null,
    directory: null,
    unknownMemberLabel: 'Unknown member',
    canWrite: false,
    canManage: false,
    ...overrides,
  };
}

describe('buildMessageViews', () => {
  it('resolves the author name and avatar from the directory', () => {
    const directory = new Map<string, MemberDirectoryEntry>([
      [
        'member-1',
        {
          memberId: 'member-1',
          displayName: 'Jean',
          avatarUrl: 'a.png',
          isActive: true,
          roleNames: [],
        },
      ],
    ]);

    const [view] = buildMessageViews(baseInput({ directory }));

    expect(view.authorId).toBe('member-1');
    expect(view.authorName).toBe('Jean');
    expect(view.authorAvatarUrl).toBe('a.png');
  });

  it('falls back to the message-stamped name, then the unknown label', () => {
    const [withStamp] = buildMessageViews(
      baseInput({ messages: [message({ authorDisplayName: 'Stamped' })] }),
    );
    expect(withStamp.authorName).toBe('Stamped');

    const [withoutStamp] = buildMessageViews(baseInput());
    expect(withoutStamp.authorName).toBe('Unknown member');
  });

  it('marks a message own only when it matches the reader IRI', () => {
    const ownMemberIri = '/api/organizations/org-1/members/member-1';

    const [own] = buildMessageViews(baseInput({ ownMemberIri }));
    expect(own.isOwn).toBe(true);

    const [notOwn] = buildMessageViews(
      baseInput({ ownMemberIri: '/api/organizations/org-1/members/member-2' }),
    );
    expect(notOwn.isOwn).toBe(false);
  });

  it('reports failed over pending, and sent when neither applies', () => {
    const [failed] = buildMessageViews(
      baseInput({ pendingMessageIds: ['message-1'], failedMessageIds: ['message-1'] }),
    );
    expect(failed.status).toBe('failed');

    const [pending] = buildMessageViews(baseInput({ pendingMessageIds: ['message-1'] }));
    expect(pending.status).toBe('pending');

    const [sent] = buildMessageViews(baseInput());
    expect(sent.status).toBe('sent');
  });

  it('mirrors the server permission rules into canEdit and canDelete', () => {
    const ownMemberIri = '/api/organizations/org-1/members/member-1';

    const [ownWriter] = buildMessageViews(baseInput({ ownMemberIri, canWrite: true }));
    expect(ownWriter.canEdit).toBe(true);
    expect(ownWriter.canDelete).toBe(true);

    const [readerOnOther] = buildMessageViews(
      baseInput({ ownMemberIri: '/api/organizations/org-1/members/member-2', canWrite: true }),
    );
    expect(readerOnOther.canEdit).toBe(false);
    expect(readerOnOther.canDelete).toBe(false);

    const [managerOnOther] = buildMessageViews(
      baseInput({
        ownMemberIri: '/api/organizations/org-1/members/member-2',
        canManage: true,
      }),
    );
    expect(managerOnOther.canEdit).toBe(false);
    expect(managerOnOther.canDelete).toBe(true);

    const [tombstone] = buildMessageViews(
      baseInput({
        ownMemberIri,
        canWrite: true,
        canManage: true,
        messages: [message({ isDeleted: true, body: undefined })],
      }),
    );
    expect(tombstone.canEdit).toBe(false);
    expect(tombstone.canDelete).toBe(false);
  });

  it('carries the pin, save and reply-count facts into the view', () => {
    const [view] = buildMessageViews(
      baseInput({
        messages: [message({ pinnedAt: '2026-01-02T00:00:00.000Z', isSaved: true, replyCount: 3 })],
      }),
    );

    expect(view.isPinned).toBe(true);
    expect(view.isSaved).toBe(true);
    expect(view.replyCount).toBe(3);

    const [bare] = buildMessageViews(baseInput());
    expect(bare.isPinned).toBe(false);
  });

  it('renders the body through renderMessageBodyHtml, mentions included', () => {
    const [view] = buildMessageViews(
      baseInput({
        messages: [
          message({
            body: 'Hi &#64;{7f1c0000-0000-0000-0000-000000000000}',
            mentionNames: { '7f1c0000-0000-0000-0000-000000000000': 'Bob' },
          }),
        ],
      }),
    );

    expect(view.bodyHtml).toContain('Bob');
  });
});
