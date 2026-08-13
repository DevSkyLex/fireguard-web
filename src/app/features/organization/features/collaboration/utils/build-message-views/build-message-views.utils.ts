import type {
  BuildMessageViewsInput,
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

    return {
      id: message.id,
      authorId,
      authorName: authorEntry?.displayName ?? message.authorDisplayName ?? input.unknownMemberLabel,
      authorAvatarUrl: authorEntry?.avatarUrl,
      bodyHtml: renderMessageBodyHtml(message.body, message.mentionNames, input.unknownMemberLabel),
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isDeleted: message.isDeleted,
      isOwn: input.ownMemberIri !== null && message.authorMember === input.ownMemberIri,
      status: failed.has(message.id) ? 'failed' : pending.has(message.id) ? 'pending' : 'sent',
      reactions: message.reactions,
    };
  });
}
