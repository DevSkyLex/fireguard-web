import type { MemberDirectoryEntry } from '@features/organization/models';
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
  /** The thread in reading order, as `MessageThreadStore.sortedMessages` exposes it. */
  readonly messages: readonly MessageOutput[];
  readonly pendingMessageIds: readonly string[];
  readonly failedMessageIds: readonly string[];
  /** The reader's own member IRI, or `null` before the profile resolves. */
  readonly ownMemberIri: string | null;
  /** The resolved member directory, or `null` while it is unavailable. */
  readonly directory: ReadonlyMap<string, MemberDirectoryEntry> | null;
  /** Stands in wherever a member cannot be named. Never a raw id. */
  readonly unknownMemberLabel: string;
  /**
   * Whether the reader holds `organization.messaging.write`, which gates
   * editing their own messages (and, on the surface, replying and pinning).
   */
  readonly canWrite: boolean;
  /**
   * Whether the reader holds `organization.messaging.manage`, which lets
   * them delete another member's message.
   */
  readonly canManage: boolean;
}
