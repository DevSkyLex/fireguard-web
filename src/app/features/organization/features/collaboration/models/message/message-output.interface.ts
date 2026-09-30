import type { HydraItem } from '@core/api/models';
import type { MessageReactionOutput } from './message-reaction-output.interface';
import type { MessageReferenceOutput } from './message-reference-output.interface';

/**
 * Interface MessageOutput
 * @interface MessageOutput
 *
 * @description
 * A posted message. Wire shape of the API's `MessageResource`.
 * Two fields cannot be trusted unconditionally: {@link replyCount} and
 * {@link references} are rebuilt without their real arguments by the reaction
 * and save handlers, so those two responses always report `0` and `[]`. Merge
 * only `reactions` / `isSaved` from them.
 * There is deliberately no `parentMessageId`: thread membership is only
 * knowable from which `/replies` list a row came from.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Bare UUID. The entity key.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property conversation
   * @readonly
   *
   * @description
   * IRI of the owning conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly conversation: string;

  /**
   * Property authorMember
   * @readonly
   *
   * @description
   * IRI `/api/organizations/{orgId}/members/{memberId}`, which has no GET route.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorMember: string;

  /**
   * Property authorDisplayName
   * @readonly
   *
   * @description
   * Carried on the message so the thread never depends on the member
   * directory, which is gated behind `organization.members.read` — without it
   * every message was headed by a raw UUID. Omitted only when the API could
   * not derive a name at all.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorDisplayName?: string;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Sanitized rich text. Omitted once the message is tombstoned.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body?: string;

  /**
   * Property mentions
   * @readonly
   *
   * @description
   * Member IRIs parsed server-side from `@{memberUuid}` markers. Empty on a tombstone.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly mentions: readonly string[];

  /**
   * Property mentionNames
   * @readonly
   *
   * @description
   * the same token the body carries — so a chip resolves without parsing an
   * IRI. Empty on a tombstone; an unresolvable member is simply absent.
   *
   * @access public
   *
   * @type {Readonly<Record<string, string>>}
   */
  readonly mentionNames: Readonly<Record<string, string>>;

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
   * deleted message keeps its row for compliance and is only redacted at the
   * API boundary.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isDeleted: boolean;

  /**
   * Property deletedAt
   * @readonly
   *
   * @description
   * Records when deleted occurs for this message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly deletedAt?: string;

  /**
   * Property attachments
   * @readonly
   *
   * @description
   * Embedded attachment objects. Empty on a tombstone.
   *
   * @access public
   *
   * @type {readonly MessageAttachmentSummary[]}
   */
  readonly attachments: readonly MessageAttachmentSummary[];

  /**
   * Property pinnedAt
   * @readonly
   *
   * @description
   * Not redacted on a tombstone.
   *
   * @access public
   *
   * @type {string}
   */
  readonly pinnedAt?: string;

  /**
   * Property pinnedBy
   * @readonly
   *
   * @description
   * Identifies the member who pinned this message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly pinnedBy?: string;

  /**
   * Property reactions
   * @readonly
   *
   * @description
   * Empty on a tombstone.
   *
   * @access public
   *
   * @type {readonly MessageReactionOutput[]}
   */
  readonly reactions: readonly MessageReactionOutput[];

  /**
   * Property isSaved
   * @readonly
   *
   * @description
   * Caller-private: whether the acting member bookmarked this message.
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
   * Unreliable in reaction and save responses, where it is always `0`.
   *
   * @access public
   *
   * @type {number}
   */
  readonly replyCount: number;

  /**
   * Property references
   * @readonly
   *
   * @description
   * Unreliable in reaction and save responses, where it is always `[]`.
   *
   * @access public
   *
   * @type {readonly MessageReferenceOutput[]}
   */
  readonly references: readonly MessageReferenceOutput[];

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this message was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Records when this message was last updated.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;
}

/**
 * Interface MessageAttachmentSummary
 * @interface MessageAttachmentSummary
 *
 * @description
 * An attachment as embedded inside a {@link MessageOutput}.
 * `revision` is always the default `1` here — the only trustworthy revision
 * comes from the upload response — so never drive a delete precondition from
 * an embedded copy.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageAttachmentSummary {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this message attachment summary.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property contentUrl
   * @readonly
   *
   * @description
   * Route, not a resource IRI, and it requires the Authorization header.
   *
   * @access public
   *
   * @type {string}
   */
  readonly contentUrl: string;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Untrusted original file name — escape before rendering.
   *
   * @access public
   *
   * @type {string}
   */
  readonly fileName: string;

  /**
   * Property mimeType
   * @readonly
   *
   * @description
   * Server-sniffed, from the upload allow-list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly mimeType: string;

  /**
   * Property size
   * @readonly
   *
   * @description
   * Reports the file size stored in this attachment metadata.
   *
   * @access public
   *
   * @type {number}
   */
  readonly size: number;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this message attachment summary.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label?: string;

  /**
   * Property uploadedAt
   * @readonly
   *
   * @description
   * Records when uploaded occurs for this message attachment summary.
   *
   * @access public
   *
   * @type {string}
   */
  readonly uploadedAt: string;
}
