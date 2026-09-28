import type {
  BuildMessageViewsInput,
  ConversationReceiptPositionOutput,
  MessageOutput,
  MessageView,
} from '@features/organization/features/collaboration/models';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { renderMessageBodyHtml } from '../render-message-body/render-message-body.utils';

/**
 * The bare id inside an organization-member IRI — the trailing path segment
 * every write to this feature's endpoints needs.
 */
function memberIdOf(memberIri: string): string {
  return memberIri.slice(memberIri.lastIndexOf('/') + 1);
}

/** Both API paging and marker positions order equal timestamps by message id. */
function coversMessage(
  positionAt: string | null,
  positionId: string | null,
  message: MessageOutput,
): boolean {
  if (positionAt === null || positionId === null) return false;
  const positionTime = Date.parse(positionAt);
  const messageTime = Date.parse(message.createdAt);
  return positionTime > messageTime || (positionTime === messageTime && positionId >= message.id);
}

/**
 * Function buildMessageViews
 * @function buildMessageViews
 *
 * @description
 * Turns a loaded thread into what a conversation surface draws: bodies
 * rendered, authors named, and each row's local delivery state attached.
 *
 * Extracted once a third caller needed it (`ARCHITECTURE.md` §2.9 — the rule of
 * three): `ChannelConversationPage` and `DirectConversationPage` carried this
 * exact mapping inline before `SubjectDiscussion` made it a third copy.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {BuildMessageViewsInput} input - The thread and the identity it is drawn against.
 *
 * @returns {readonly MessageView[]} The thread, ready to render.
 */
export function buildMessageViews(input: BuildMessageViewsInput): readonly MessageView[] {
  const pending: ReadonlySet<string> = new Set<string>(input.pendingMessageIds);
  const failed: ReadonlySet<string> = new Set<string>(input.failedMessageIds);

  return input.messages.map((message: MessageOutput): MessageView => {
    const authorId: string = memberIdOf(message.authorMember);
    const authorEntry: MemberDirectoryEntry | undefined = input.directory?.get(authorId);
    const isOwn: boolean =
      input.ownMemberIri !== null && message.authorMember === input.ownMemberIri;
    let status: MessageView['status'] = 'sent';
    if (failed.has(message.id)) status = 'failed';
    else if (pending.has(message.id)) status = 'pending';

    const receipt =
      isOwn && status === 'sent' && input.receiptKind !== undefined
        ? {
            kind: input.receiptKind,
            deliveredCount: (input.receiptPositions ?? []).filter(
              (position: ConversationReceiptPositionOutput): boolean =>
                position.memberId !== authorId &&
                coversMessage(position.deliveredThroughAt, position.deliveredMessageId, message),
            ).length,
            readCount: (input.receiptPositions ?? []).filter(
              (position: ConversationReceiptPositionOutput): boolean =>
                position.memberId !== authorId &&
                coversMessage(position.readThroughAt, position.readMessageId, message),
            ).length,
          }
        : undefined;

    return {
      id: message.id,
      authorId,
      authorName: authorEntry?.displayName ?? message.authorDisplayName ?? input.unknownMemberLabel,
      authorAvatarUrl: authorEntry?.avatarUrl,
      bodyHtml: renderMessageBodyHtml(message.body, message.mentionNames, input.unknownMemberLabel),
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isDeleted: message.isDeleted,
      isOwn,
      status,
      receipt,
      isPinned: message.pinnedAt !== undefined,
      isSaved: message.isSaved,
      replyCount: message.replyCount,
      canEdit: isOwn && input.canWrite && !message.isDeleted,
      canDelete: (isOwn || input.canManage) && !message.isDeleted,
      reactions: message.reactions,
    };
  });
}
