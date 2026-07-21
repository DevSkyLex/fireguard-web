import type { HydraItem } from '@core/api/models';

/**
 * What the channel endpoints return.
 *
 * Deliberately **not** a `ConversationOutput`: the two shapes overlap but do
 * not match. A channel carries `participantCount`, `createdByMember` and a
 * `parent` IRI, and has none of the conversation's `subjectType`,
 * `visibility`, `isChannel` or `parentConversationId`. Treating one as the
 * other is how a create silently produces a half-populated row in the list.
 *
 * After creating a channel, reload the conversation inventory rather than
 * folding this into it.
 *
 * @since 5.0.0
 */
export interface ChannelOutput extends HydraItem {
  readonly id: string;
  readonly organization: string;
  readonly name: string;
  readonly team: string | null;
  readonly createdByMember: string | null;
  readonly participantCount: number;
  readonly isArchived: boolean;
  readonly lastMessageAt: string | null;
  readonly messagesCount: number;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isFavorite: boolean;

  /**
   * Parent channel IRI when nested. A root channel omits the key entirely —
   * API Platform does not serialize null relations — so this is optional, not
   * merely nullable.
   */
  readonly parent?: string | null;
}
