import type { InboxItemOutput } from '@features/account/models';

/**
 * Function displayInboxTitle
 * @description Localizes known source-owned titles while preserving the server title for other inbox entries.
 * @access public
 * @since 1.0.0
 * @param {InboxItemOutput} item - Source-owned inbox entry.
 * @returns {string} Title displayed in account inbox surfaces.
 */
export function displayInboxTitle(item: InboxItemOutput): string {
  if (item.sourceKey === 'messaging.mention' && item.kind === 'mention') {
    return $localize`:@@account.inbox.mentionTitle:You were mentioned in a conversation`;
  }

  return item.title;
}
