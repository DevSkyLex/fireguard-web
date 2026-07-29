import type { HydraItem } from '@core/api/models';

/**
 * Interface ChannelOutput
 * @interface ChannelOutput
 *
 * @description
 * A named group conversation. Wire shape of the API's `ChannelResource`.
 *
 * Key rows off {@link id}, never off `@id`: this DTO is re-normalized through
 * the anonymous JSON-LD path, so `@id` is a fresh Skolem genid on every
 * response and `@type` is the DTO class name rather than a resource type.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelOutput extends HydraItem {
  /** Bare UUID. The entity key. */
  readonly id: string;
  /** IRI of the owning organization. */
  readonly organization: string;
  /** Channel name, 2–80 characters. */
  readonly name: string;
  /** IRI of the bound organization team, omitted when the channel is unbound. */
  readonly team?: string;
  /** IRI of the member who created the channel. */
  readonly createdByMember?: string;
  /** Number of participants, including those pulled in by a bound team. */
  readonly participantCount: number;
  readonly isArchived: boolean;
  /** ISO-8601 with a numeric offset; omitted while the channel has no message. */
  readonly lastMessageAt?: string;
  /** Total messages, replies included. */
  readonly messagesCount: number;
  /**
   * Unread messages for the acting member.
   *
   * Hard-coded to `0` by the list provider and by every write response — only
   * trust it from a source that genuinely computes it.
   */
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Whether the acting member favorited the channel. Always `false` on write responses. */
  readonly isFavorite: boolean;
  /** IRI of the parent channel when nested, omitted at the root. */
  readonly parent?: string;
}
