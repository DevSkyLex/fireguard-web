import type { MessageReactionOutput } from '../message';
import type { MessageSendStatus } from './message-send-status.type';

/**
 * Interface MessageView
 * @interface MessageView
 *
 * @description
 * One message as a conversation surface needs to draw it: the transport shape
 * with its author resolved, its body rendered, and its local delivery state
 * attached.
 *
 * Everything here is a primitive. Two fields carry the weight of that:
 * {@link bodyHtml} is **already rendered**, so mention chips and the sanitizer's
 * conventions stay with whoever owns the messages, and {@link authorName} is
 * **already resolved**, so a surface never has to reach for the member
 * directory and never has an excuse to print a raw id.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageView {
  readonly id: string;
  /** Bare member id. Compared to group a run of messages, never resolved here. */
  readonly authorId: string;
  /** Never blank — resolving it is the page's job. */
  readonly authorName: string;
  readonly authorAvatarUrl?: string;
  /** Rendered HTML. Empty on a tombstone, which draws a placeholder instead. */
  readonly bodyHtml: string;
  /** ISO instant. */
  readonly createdAt: string;
  readonly editedAt?: string;
  readonly isDeleted: boolean;
  /** Whether the reading member wrote it, which decides the row's side. */
  readonly isOwn: boolean;
  readonly status: MessageSendStatus;
  /** Whether the message is pinned in its conversation — visible to every reader. */
  readonly isPinned: boolean;
  /** Whether the reading member bookmarked it. Private to that member. */
  readonly isSaved: boolean;
  /** Threaded replies under this message. Never redacted on a tombstone. */
  readonly replyCount: number;
  /**
   * Whether the reader may edit this message. Mirrors the server's rule —
   * author only, holding `messaging.write` — and never replaces it: the
   * server re-checks every write.
   */
  readonly canEdit: boolean;
  /**
   * Whether the reader may delete this message: its author, or a holder of
   * `organization.messaging.manage`. Mirrors the server's check, never
   * replaces it.
   */
  readonly canDelete: boolean;
  /**
   * Emoji tallies, passed through from the transport unchanged: the shape is
   * already a count and a "did I" flag, which is exactly what a chip draws.
   */
  readonly reactions: readonly MessageReactionOutput[];
}
