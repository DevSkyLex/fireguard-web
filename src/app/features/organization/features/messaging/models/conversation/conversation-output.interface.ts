import type { HydraItem } from '@core/api/models';

/**
 * What a conversation is attached to.
 *
 * A conversation is either a standalone channel/DM (`none`) or bound to a
 * record. The record-bound values exist in the API but no view surfaces them
 * yet — see the messaging FEATURE.md.
 *
 * @since 1.0.0
 */
export type ConversationSubjectType =
  | 'none'
  | 'facility'
  | 'equipment'
  | 'intervention'
  | 'non_conformity';

/**
 * Who can see a conversation.
 *
 * @since 1.0.0
 */
export type ConversationVisibility = 'public' | 'private' | 'direct';

/**
 * A channel, direct conversation, or record-bound thread.
 *
 * `isChannel` discriminates: a channel has a `name`, a direct conversation is
 * named after its participants and carries `visibility: 'direct'`.
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
}
