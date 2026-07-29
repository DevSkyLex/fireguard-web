import type { HydraItem } from '@core/api/models';
import type { ConversationSubjectType } from './conversation-subject-type.type';
import type { ConversationVisibility } from './conversation-visibility.type';

/**
 * Interface ConversationOutput
 * @interface ConversationOutput
 *
 * @description
 * A conversation: a subject thread, a channel, or a direct message. All three
 * share this shape and are told apart by {@link subjectType}.
 *
 * Several fields are only real on some responses. {@link unreadCount} and
 * {@link isFavorite} are fabricated as `0` / `false` by every write endpoint,
 * and {@link subjectLabel} is resolved only when reading a single conversation
 * or opening one by subject. Patch, never merge wholesale.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationOutput extends HydraItem {
  /** Bare UUID. The entity key — never use `@id`. */
  readonly id: string;
  /** IRI of the owning organization. */
  readonly organization: string;
  readonly subjectType: ConversationSubjectType;
  /**
   * IRI of the attached record. Omitted for channels. For a direct
   * conversation this is an opaque `/api/direct/<32hex>` hash — never decode
   * it, and never try to dereference it.
   */
  readonly subject?: string;
  /** Resolved only by `GET /conversations/{id}` and `POST /conversations`. */
  readonly subjectLabel?: string;
  readonly visibility: ConversationVisibility;
  /** ISO-8601 with a numeric offset; omitted until the first message. */
  readonly lastMessageAt?: string;
  /** Replies included. */
  readonly messagesCount: number;
  readonly isArchived: boolean;
  /** Real on the list and item reads only; `0` on every write response. */
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** True only for `subjectType === 'channel'` — a direct conversation is not a channel. */
  readonly isChannel: boolean;
  /** Channels only; never present for a direct conversation. */
  readonly name?: string;
  /** IRI of the bound organization team. */
  readonly team?: string;
  /** Real on the list and item reads only; `false` on every write response. */
  readonly isFavorite: boolean;
  /** Bare parent conversation id — not an IRI, unlike most references here. */
  readonly parentConversationId?: string;
  /**
   * The other participant's member IRI. Present only on
   * `GET /api/direct-conversations`, which is why that list cannot be replaced
   * by the create response — the latter has no counterpart and would render
   * unlabeled.
   */
  readonly counterpartMember?: string;
}
