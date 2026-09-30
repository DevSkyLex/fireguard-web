import type { MessageReactionOutput } from '../message';
import type { MessageReceiptView } from './message-receipt-view.interface';
import type { MessageSendStatus } from './message-send-status.type';

/**
 * Interface MessageView
 * @interface MessageView
 *
 * @description
 * One message as a conversation surface needs to draw it: the transport shape
 * with its author resolved, its body rendered, and its local delivery state
 * attached.
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
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property authorId
   * @readonly
   *
   * @description
   * Bare member id. Compared to group a run of messages, never resolved here.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorId: string;

  /**
   * Property authorName
   * @readonly
   *
   * @description
   * Never blank — resolving it is the page's job.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorName: string;

  /**
   * Property authorAvatarUrl
   * @readonly
   *
   * @description
   * Provides the author avatar URL when an avatar is available.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorAvatarUrl?: string;

  /**
   * Property bodyHtml
   * @readonly
   *
   * @description
   * Rendered HTML. Empty on a tombstone, which draws a placeholder instead.
   *
   * @access public
   *
   * @type {string}
   */
  readonly bodyHtml: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property editedAt
   * @readonly
   *
   * @description
   * Records when edited occurs for this message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly editedAt?: string;

  /**
   * Property isDeleted
   * @readonly
   *
   * @description
   * Indicates whether this message is deleted.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isDeleted: boolean;

  /**
   * Property isOwn
   * @readonly
   *
   * @description
   * Whether the reading member wrote it, which decides the row's side.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isOwn: boolean;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this message.
   *
   * @access public
   *
   * @type {MessageSendStatus}
   */
  readonly status: MessageSendStatus;

  /**
   * Property receipt
   * @readonly
   *
   * @description
   * Present only on confirmed messages in direct conversations and channels.
   *
   * @access public
   *
   * @type {MessageReceiptView}
   */
  readonly receipt?: MessageReceiptView;

  /**
   * Property isPinned
   * @readonly
   *
   * @description
   * Whether the message is pinned in its conversation — visible to every reader.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isPinned: boolean;

  /**
   * Property isSaved
   * @readonly
   *
   * @description
   * Whether the reading member bookmarked it. Private to that member.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isSaved: boolean;

  /**
   * Property replyCount
   * @readonly
   *
   * @description
   * Threaded replies under this message. Never redacted on a tombstone.
   *
   * @access public
   *
   * @type {number}
   */
  readonly replyCount: number;

  /**
   * Property canEdit
   * @readonly
   *
   * @description
   * author only, holding `messaging.write` — and never replaces it: the
   * server re-checks every write.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canEdit: boolean;

  /**
   * Property canDelete
   * @readonly
   *
   * @description
   * `organization.messaging.manage`. Mirrors the server's check, never
   * replaces it.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canDelete: boolean;

  /**
   * Property reactions
   * @readonly
   *
   * @description
   * already a count and a "did I" flag, which is exactly what a chip draws.
   *
   * @access public
   *
   * @type {readonly MessageReactionOutput[]}
   */
  readonly reactions: readonly MessageReactionOutput[];
}
