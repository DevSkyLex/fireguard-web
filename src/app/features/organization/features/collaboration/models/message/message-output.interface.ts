import type { HydraItem } from '@core/api/models';
import type { MessageReactionOutput } from './message-reaction-output.interface';
import type { MessageReferenceOutput } from './message-reference-output.interface';

/**
 * Interface MessageOutput
 * @interface MessageOutput
 *
 * @description
 * A posted message. Wire shape of the API's `MessageResource`.
 *
 * Two fields cannot be trusted unconditionally: {@link replyCount} and
 * {@link references} are rebuilt without their real arguments by the reaction
 * and save handlers, so those two responses always report `0` and `[]`. Merge
 * only `reactions` / `isSaved` from them.
 *
 * There is deliberately no `parentMessageId`: thread membership is only
 * knowable from which `/replies` list a row came from.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageOutput extends HydraItem {
  /** Bare UUID. The entity key. */
  readonly id: string;
  /** IRI of the owning conversation. */
  readonly conversation: string;
  /** IRI `/api/organizations/{orgId}/members/{memberId}`, which has no GET route. */
  readonly authorMember: string;
  /**
   * The author's human-readable name.
   *
   * Carried on the message so the thread never depends on the member
   * directory, which is gated behind `organization.members.read` — without it
   * every message was headed by a raw UUID. Omitted only when the API could
   * not derive a name at all.
   */
  readonly authorDisplayName?: string;
  /** Sanitized rich text. Omitted once the message is tombstoned. */
  readonly body?: string;
  /** Member IRIs parsed server-side from `@{memberUuid}` markers. Empty on a tombstone. */
  readonly mentions: readonly string[];
  /**
   * Display names for the mentioned members, keyed by the **bare** member id —
   * the same token the body carries — so a chip resolves without parsing an
   * IRI. Empty on a tombstone; an unresolvable member is simply absent.
   */
  readonly mentionNames: Readonly<Record<string, string>>;
  readonly editedAt?: string;
  /**
   * The tombstone flag. Test this rather than the absence of {@link body}: a
   * deleted message keeps its row for compliance and is only redacted at the
   * API boundary.
   */
  readonly isDeleted: boolean;
  readonly deletedAt?: string;
  /** Embedded attachment objects. Empty on a tombstone. */
  readonly attachments: readonly MessageAttachmentSummary[];
  /** Not redacted on a tombstone. */
  readonly pinnedAt?: string;
  readonly pinnedBy?: string;
  /** Empty on a tombstone. */
  readonly reactions: readonly MessageReactionOutput[];
  /** Caller-private: whether the acting member bookmarked this message. */
  readonly isSaved: boolean;
  /** Unreliable in reaction and save responses, where it is always `0`. */
  readonly replyCount: number;
  /** Unreliable in reaction and save responses, where it is always `[]`. */
  readonly references: readonly MessageReferenceOutput[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Interface MessageAttachmentSummary
 * @interface MessageAttachmentSummary
 *
 * @description
 * An attachment as embedded inside a {@link MessageOutput}.
 *
 * `revision` is always the default `1` here — the only trustworthy revision
 * comes from the upload response — so never drive a delete precondition from
 * an embedded copy.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageAttachmentSummary {
  readonly id: string;
  /** Route, not a resource IRI, and it requires the Authorization header. */
  readonly contentUrl: string;
  /** Untrusted original file name — escape before rendering. */
  readonly fileName: string;
  /** Server-sniffed, from the upload allow-list. */
  readonly mimeType: string;
  readonly size: number;
  readonly label?: string;
  readonly uploadedAt: string;
}
