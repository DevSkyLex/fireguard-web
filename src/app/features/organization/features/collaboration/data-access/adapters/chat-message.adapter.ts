import type {
  MessageOutput,
  MessageReactionOutput,
} from '@features/organization/features/collaboration/models';
import { renderMessageBodyHtml } from '@features/organization/features/collaboration/utils';
import type { ChatMessageItem, ChatMessageStatus } from '@shared/chat';

/**
 * Function toChatMessageItem
 * @function toChatMessageItem
 *
 * @description
 * Projects a message from the wire onto the view-model `@shared/chat` renders.
 *
 * This is the whole boundary. Everything the chat concept must not know ends
 * here: the mention marker form — which is this API's, since its sanitizer
 * rewrites every `@` — the IRI an author is identified by, and the fact that
 * delivery state is tracked as id lists rather than per message.
 *
 * The message keeps a reference to itself under `data`, which is what an
 * `appChatMessageExtra` template reads to render reference cards the row
 * cannot understand.
 *
 * Pure: labels arrive as parameters rather than through `$localize`, so this
 * stays callable from anywhere, including a test with no i18n runtime.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {MessageOutput} message - The message as the API sent it.
 * @param {ToChatMessageOptions} options - Names, delivery state and fallback labels.
 *
 * @returns {ChatMessageItem<MessageOutput>} The row's view-model.
 *
 * @example
 * ```typescript
 * toChatMessageItem(message, { status: 'pending', memberNames, unknownMention: 'member', unknownAuthor: 'Unknown member' });
 * ```
 */
export function toChatMessageItem(
  message: MessageOutput,
  options: ToChatMessageOptions,
): ChatMessageItem<MessageOutput> {
  return {
    id: message.id,
    authorId: message.authorMember,
    authorName: message.authorDisplayName ?? options.unknownAuthor,
    bodyHtml: renderMessageBodyHtml(message.body, options.memberNames, options.unknownMention),
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    isDeleted: message.isDeleted,
    isSaved: message.isSaved,
    isPinned: Boolean(message.pinnedAt),
    canDelete: options.canModerate || message.authorMember === options.actingMember,
    replyCount: message.replyCount,
    status: options.status,
    reactions: message.reactions.map((reaction: MessageReactionOutput) => ({
      emoji: reaction.emoji,
      count: reaction.count,
      reactedByMe: reaction.reactedByMe,
    })),
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
    })),
    data: message,
  };
}

/**
 * Function withChatMessageStatus
 * @function withChatMessageStatus
 *
 * @description
 * Returns the same message carrying a different delivery state.
 *
 * A copy rather than a mutation: the row is `OnPush`, and a message whose
 * status changed in place is a message Angular has no reason to re-render.
 *
 * It exists as a named function because rendering the body is the expensive
 * half of {@link toChatMessageItem} — memoize that once, and re-stamping the
 * two or three messages actually in flight costs nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ChatMessageItem<TData>} message - The projected message.
 * @param {ChatMessageStatus} status - Its delivery state.
 *
 * @returns {ChatMessageItem<TData>} A copy with that status.
 *
 * @example
 * ```typescript
 * withChatMessageStatus(message, 'failed');
 * ```
 */
export function withChatMessageStatus<TData>(
  message: ChatMessageItem<TData>,
  status: ChatMessageStatus,
): ChatMessageItem<TData> {
  return { ...message, status };
}

/**
 * Interface ToChatMessageOptions
 * @interface ToChatMessageOptions
 *
 * @description
 * Everything {@link toChatMessageItem} needs that the message itself does not
 * carry.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ToChatMessageOptions {
  /** Delivery state, which the thread store tracks as id lists. */
  readonly status: ChatMessageStatus;
  /** Display names by bare member id, for the mention chips. */
  readonly memberNames: Readonly<Record<string, string>>;
  /** Shown for a mentioned member who cannot be resolved. */
  readonly unknownMention: string;
  /** Shown when the API derived no author name at all. */
  readonly unknownAuthor: string;
  /**
   * Member IRI of the reader, or `null` when it cannot be resolved.
   *
   * Compared against the author to decide whether deletion is offered. The
   * server enforces the same rule; this only keeps the control off a row it
   * would refuse.
   */
  readonly actingMember: string | null;
  /** Whether the reader holds `organization.messaging.manage`, which deletes anyone's message. */
  readonly canModerate: boolean;
}
