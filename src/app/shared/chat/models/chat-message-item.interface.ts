import type { ChatAttachment } from './chat-attachment.interface';
import type { ChatMessageStatus } from './chat-message-status.type';
import type { ChatReaction } from './chat-reaction.interface';

/**
 * Interface ChatMessageItem
 * @interface ChatMessageItem
 *
 * @description
 * One message, as a conversation surface needs to draw it.
 *
 * Everything here is a primitive or another chat type: no transport shape, no
 * identifier that only one API can resolve. That is what lets this concept be
 * lifted into another application without dragging a backend behind it.
 *
 * Two fields carry the weight of that boundary:
 *
 * - {@link bodyHtml} is **already rendered**. Mention chips, sanitizer
 *   conventions, a Markdown pass — all of that belongs to whoever owns the
 *   messages, and none of it reaches here.
 * - {@link data} is the consumer's own payload, round-tripped untouched. It is
 *   what an `appChatMessageExtra` template reads to render something only that
 *   consumer understands, which is how domain-bearing content gets into a row
 *   without the row knowing what it is.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatMessageItem<TData = unknown> {
  readonly id: string;
  /**
   * Author identity, used to decide where one person's run of messages ends.
   * Opaque: it is compared, never resolved.
   */
  readonly authorId: string;
  /** Never blank — resolving it is the caller's job. */
  readonly authorName: string;
  readonly authorAvatarUrl?: string;
  /** Rendered HTML. Empty on a deleted message, which draws a placeholder. */
  readonly bodyHtml: string;
  /** ISO instant. */
  readonly createdAt: string;
  readonly editedAt?: string;
  readonly isDeleted: boolean;
  readonly isSaved: boolean;
  /** Whether the message is pinned in its conversation — shared, unlike {@link isSaved}. */
  readonly isPinned: boolean;
  /**
   * Whether the reader may delete this message.
   *
   * On the view-model rather than on the surface because it is decided per
   * message: an author may delete their own, a moderator anyone's. Only the
   * consumer can answer that, and a destructive control offered to someone the
   * server will refuse is worse than no control at all.
   */
  readonly canDelete: boolean;
  /** Threaded replies to this message, for the affordance that opens them. */
  readonly replyCount: number;
  readonly status: ChatMessageStatus;
  readonly reactions: readonly ChatReaction[];
  readonly attachments: readonly ChatAttachment[];
  /** Opaque consumer payload, for the `appChatMessageExtra` template. */
  readonly data?: TData;
}
