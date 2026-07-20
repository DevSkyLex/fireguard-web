import type { ConversationOutput } from '@features/organization/features/messaging/models';

/**
 * Interface ChannelTreeNode
 *
 * @description
 * One sidebar channel row: the conversation and its nested children. A single
 * level of nesting — the backend guards the hierarchy to one parent hop.
 *
 * @since 1.0.0
 */
export interface ChannelTreeNode {
  readonly conversation: ConversationOutput;
  readonly children: readonly ConversationOutput[];
}

/**
 * Function buildChannelTree
 *
 * @description
 * Groups channels under their parent for the sidebar's Channels section.
 * A channel whose parent is not in the list (not readable, or filtered out
 * by the search) is promoted to a root rather than dropped — hiding a
 * channel because its PARENT is invisible would make it unreachable.
 *
 * @param {readonly ConversationOutput[]} channels - The visible channels.
 *
 * @returns {readonly ChannelTreeNode[]} Root nodes in list order, children attached.
 *
 * @since 1.0.0
 */
export function buildChannelTree(
  channels: readonly ConversationOutput[],
): readonly ChannelTreeNode[] {
  const ids: ReadonlySet<string> = new Set(
    channels.map((channel: ConversationOutput): string => channel.id),
  );

  const isRoot = (channel: ConversationOutput): boolean =>
    channel.parentConversationId === null || !ids.has(channel.parentConversationId);

  return channels.filter(isRoot).map(
    (root: ConversationOutput): ChannelTreeNode => ({
      conversation: root,
      children: channels.filter(
        (candidate: ConversationOutput): boolean => candidate.parentConversationId === root.id,
      ),
    }),
  );
}
