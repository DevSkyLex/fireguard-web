import type { MemberDirectoryEntry } from '@features/organization/models';
import type { ConversationReceiptPositionOutput } from '../conversation';
import type { MessageOutput } from '../message';

/**
 * Interface BuildMessageViewsInput
 * @interface BuildMessageViewsInput
 *
 * @description
 * Everything `buildMessageViews` needs to draw a thread. Every field is a
 * plain value rather than a store or a port, so the function stays pure — the
 * three surfaces that call it (`ChannelConversationPage`, `DirectConversationPage`,
 * `SubjectDiscussion`) each resolve their own directory and identity first.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BuildMessageViewsInput {
  /**
   * Property messages
   * @readonly
   *
   * @description
   * The thread in reading order, as `MessageThreadStore.sortedMessages` exposes it.
   *
   * @access public
   *
   * @type {readonly MessageOutput[]}
   */
  readonly messages: readonly MessageOutput[];

  /**
   * Property pendingMessageIds
   * @readonly
   *
   * @description
   * Lists local message ids whose optimistic rows are awaiting confirmation.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly pendingMessageIds: readonly string[];

  /**
   * Property failedMessageIds
   * @readonly
   *
   * @description
   * Lists local message ids whose sends need a retry action.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly failedMessageIds: readonly string[];

  /**
   * Property ownMemberIri
   * @readonly
   *
   * @description
   * The reader's own member IRI, or `null` before the profile resolves.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly ownMemberIri: string | null;

  /**
   * Property directory
   * @readonly
   *
   * @description
   * The resolved member directory, or `null` while it is unavailable.
   *
   * @access public
   *
   * @type {ReadonlyMap<string, MemberDirectoryEntry> | null}
   */
  readonly directory: ReadonlyMap<string, MemberDirectoryEntry> | null;

  /**
   * Property unknownMemberLabel
   * @readonly
   *
   * @description
   * Stands in wherever a member cannot be named. Never a raw id.
   *
   * @access public
   *
   * @type {string}
   */
  readonly unknownMemberLabel: string;

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * editing their own messages (and, on the surface, replying and pinning).
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canWrite: boolean;

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * them delete another member's message.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canManage: boolean;

  /**
   * Property receiptKind
   * @readonly
   *
   * @description
   * Omitted for contextual subject threads, which do not expose receipts.
   *
   * @access public
   *
   * @type {'direct' | 'channel'}
   */
  readonly receiptKind?: 'direct' | 'channel';

  /**
   * Property receiptPositions
   * @readonly
   *
   * @description
   * Provides member delivery and read positions used to derive message receipts.
   *
   * @access public
   *
   * @type {readonly ConversationReceiptPositionOutput[]}
   */
  readonly receiptPositions?: readonly ConversationReceiptPositionOutput[];
}
