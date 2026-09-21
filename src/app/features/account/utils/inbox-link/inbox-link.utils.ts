import type { InboxItemOutput } from '@features/account/models';

/**
 * Function inboxConversationLink
 * @description Resolves the published collaboration routes from the source-owned target; notifications have no conversation action.
 * @access public
 * @since 1.0.0
 * @param {InboxItemOutput} item - Server inbox entry.
 * @returns {readonly string[] | null} Conversation route commands or no navigation.
 */
export function inboxConversationLink(item: InboxItemOutput): readonly string[] | null {
  if (
    item.sourceKey !== 'messaging.mention' ||
    item.targetType !== 'conversation' ||
    !item.organizationId
  )
    return null;
  return [
    '/organizations',
    item.organizationId,
    item.targetKind === 'channel' ? 'channels' : 'messages',
    item.targetId,
  ];
}
