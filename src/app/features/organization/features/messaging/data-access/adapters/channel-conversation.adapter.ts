import type {
  ChannelOutput,
  ConversationOutput,
} from '@features/organization/features/messaging/models';

/**
 * Function toConversation
 *
 * @description
 * Normalizes a `ChannelOutput` into the `ConversationOutput` shape the
 * inventory and the sidebar are built on.
 *
 * The two payloads come from different endpoints and do not match: a channel
 * carries `parent` as an IRI and `participantCount`/`createdByMember`, and has
 * none of the conversation's `subjectType`, `visibility`, `isChannel` or
 * `parentConversationId`. Every channel is by definition
 * `subjectType: 'channel'`, `visibility: 'participants'`, `isChannel: true`, so
 * those are set rather than guessed, and `parent` is reduced to a bare id
 * because the channel tree matches on ids.
 *
 * @param {ChannelOutput} channel - A row from `GET /api/channels`.
 *
 * @returns {ConversationOutput} The equivalent conversation row.
 *
 * @since 5.1.0
 */
export function toConversation(channel: ChannelOutput): ConversationOutput {
  // A root channel has NO `parent` key at all in the payload — API Platform
  // omits null relations rather than serializing them — so this must guard on
  // undefined as well as null. Reading `.lastIndexOf` off the missing value
  // used to throw and fail the whole sidebar load.
  const parent: string | null | undefined = channel.parent;
  let parentConversationId: string | null = null;

  if (typeof parent === 'string' && '' !== parent) {
    const separator: number = parent.lastIndexOf('/');
    parentConversationId = -1 === separator ? parent : parent.slice(separator + 1);
  }

  return {
    '@id': channel['@id'],
    '@type': channel['@type'],
    id: channel.id,
    organization: channel.organization,
    subjectType: 'channel',
    subject: null,
    subjectLabel: null,
    visibility: 'participants',
    lastMessageAt: channel.lastMessageAt,
    messagesCount: channel.messagesCount,
    isArchived: channel.isArchived,
    unreadCount: channel.unreadCount,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    isChannel: true,
    name: channel.name,
    team: channel.team,
    isFavorite: channel.isFavorite,
    createdByMember: channel.createdByMember,
    parentConversationId,
  };
}
