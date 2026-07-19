import type { HydraItem } from '@core/api/models';

/**
 * One emoji reaction and who reacted.
 *
 * @since 1.0.0
 */
export interface MessageReaction {
  readonly emoji: string;
  readonly count: number;
  readonly memberIds: readonly string[];
}

/**
 * A message in a conversation.
 *
 * ⚠️ `authorMember` is a **bare member id** — no name, no avatar. Rendering an
 * author requires resolving it through the organization member directory; the
 * join belongs in the store, never in a template.
 *
 * A deleted message keeps its row (`isDeleted`) so replies and reactions do not
 * dangle; `body` is `null` in that case.
 *
 * @since 1.0.0
 */
export interface MessageOutput extends HydraItem {
  readonly id: string;
  readonly conversation: string;
  readonly authorMember: string;
  readonly body: string | null;
  readonly mentions: readonly string[];
  readonly editedAt: string | null;
  readonly isDeleted: boolean;
  readonly deletedAt: string | null;
  readonly attachments: readonly string[];
  readonly pinnedAt: string | null;
  readonly pinnedBy: string | null;
  readonly reactions: readonly MessageReaction[];
  readonly isSaved: boolean;
  readonly replyCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * What the composer sends.
 *
 * @since 1.0.0
 */
export interface SendMessageInput {
  readonly body: string;
  readonly mentions?: readonly string[];
}
