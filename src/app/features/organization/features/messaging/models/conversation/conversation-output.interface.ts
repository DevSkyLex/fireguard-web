import type { HydraItem } from '@core/api/models';

/**
 * What a conversation is attached to.
 *
 * Mirrors the backend `MessagingSubjectType` exactly: a conversation is either
 * a named channel, a 1-to-1 direct thread, or bound to a business record. There
 * is no `none` value — the API never emits one.
 *
 * @since 1.0.0
 */
export type ConversationSubjectType =
  | 'channel'
  | 'direct'
  | 'facility'
  | 'equipment'
  | 'intervention'
  | 'non_conformity';

/**
 * Who can see a conversation.
 *
 * Mirrors the backend `ConversationVisibility`: `subject` for a record-bound
 * thread (anyone who can see the record), `participants` for a channel or a
 * direct conversation. A direct conversation is identified by
 * `subjectType === 'direct'`, never by this field.
 *
 * @since 1.0.0
 */
export type ConversationVisibility = 'subject' | 'participants';

/**
 * A channel, direct conversation, or record-bound thread.
 *
 * `subjectType` discriminates: `'channel'` has a `name`, `'direct'` is a 1-to-1
 * thread named after its participants (`name` is null), anything else is bound
 * to a business record. `isChannel` is the backend's convenience flag for
 * `subjectType === 'channel'`.
 *
 * @since 1.0.0
 */
export interface ConversationOutput extends HydraItem {
  readonly id: string;
  readonly organization: string;
  readonly subjectType: ConversationSubjectType;
  readonly subject: string | null;
  readonly subjectLabel: string | null;
  readonly visibility: ConversationVisibility;
  readonly lastMessageAt: string | null;
  readonly messagesCount: number;
  readonly isArchived: boolean;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isChannel: boolean;
  readonly name: string | null;
  readonly team: string | null;
  readonly isFavorite: boolean;

  /**
   * The parent channel's identifier when this channel is nested under another.
   * Null for root channels, direct conversations and subject threads — the
   * sidebar renders parented channels indented under their parent.
   */
  readonly parentConversationId: string | null;

  /**
   * The OTHER participant's member IRI on a direct conversation.
   *
   * Only sent by `GET /api/direct-conversations`. A DM has no `name`, so this
   * is what the sidebar resolves against the member directory to label the
   * row; the backend deliberately does not embed a display name.
   */
  readonly counterpartMember?: string | null;

  /**
   * The creating member's IRI.
   *
   * Only present on rows sourced from `GET /api/channels`, which is the sole
   * endpoint that reports a creator — `GET /api/conversations` does not send
   * the field at all, so it is absent (not null) on those rows and any view
   * must render nothing rather than an empty creator.
   */
  readonly createdByMember?: string | null;
}
