/**
 * Channel, participant and message transport fixtures for the e2e suite,
 * mirroring the backend contract consumed by the channels list and channel
 * conversation pages. Plain factory functions (like `api-fixtures.ts`), so
 * tests override fields via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Channel the channels-page e2e scenarios list and open. */
export const E2E_CHANNEL_ID = 'e2e-channel-1';

export interface ChannelOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly name: string;
  readonly team?: string;
  readonly createdByMember?: string;
  readonly participantCount: number;
  readonly isArchived: boolean;
  readonly lastMessageAt?: string;
  readonly messagesCount: number;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isFavorite: boolean;
  readonly parent?: string;
}

/** A root, favorited channel with unread messages — exercises the Favorites section and the unread badge. */
export function channelOutput(overrides: Partial<ChannelOutputFixture> = {}): ChannelOutputFixture {
  return {
    '@id': `/api/channels/${E2E_CHANNEL_ID}`,
    '@type': 'Channel',
    id: E2E_CHANNEL_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    name: 'general',
    createdByMember: '/api/organizations/members/e2e-member-1',
    participantCount: 3,
    isArchived: false,
    lastMessageAt: '2026-08-11T09:00:00+00:00',
    messagesCount: 2,
    unreadCount: 2,
    createdAt: '2026-01-05T00:00:00+00:00',
    updatedAt: '2026-08-11T09:00:00+00:00',
    isFavorite: true,
    ...overrides,
  };
}

/** A root, non-favorited channel with a nested child — exercises the one-level tree. */
export function inspectionsChannelOutput(
  overrides: Partial<ChannelOutputFixture> = {},
): ChannelOutputFixture {
  return channelOutput({
    id: 'e2e-channel-2',
    '@id': '/api/channels/e2e-channel-2',
    name: 'inspections',
    isFavorite: false,
    unreadCount: 0,
    messagesCount: 0,
    lastMessageAt: undefined,
    ...overrides,
  });
}

/** Nested under {@link inspectionsChannelOutput} — exercises the indented child row. */
export function inspectionsUrgentChannelOutput(
  overrides: Partial<ChannelOutputFixture> = {},
): ChannelOutputFixture {
  return channelOutput({
    id: 'e2e-channel-3',
    '@id': '/api/channels/e2e-channel-3',
    name: 'inspections-urgent',
    isFavorite: false,
    unreadCount: 0,
    messagesCount: 0,
    lastMessageAt: undefined,
    parent: '/api/channels/e2e-channel-2',
    ...overrides,
  });
}

export interface ChannelParticipantOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly memberId: string;
  readonly role?: string;
  readonly source: 'direct' | 'team';
  readonly addedAt: string;
}

/** A directly-added participant — populates the participants sheet's roster. */
export function channelParticipantOutput(
  overrides: Partial<ChannelParticipantOutputFixture> = {},
): ChannelParticipantOutputFixture {
  return {
    '@id': '/api/channels/participants/e2e-member-1',
    '@type': 'ChannelParticipant',
    memberId: 'e2e-member-1',
    source: 'direct',
    addedAt: '2026-01-05T00:00:00+00:00',
    ...overrides,
  };
}

export interface MessageOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly conversation: string;
  readonly authorMember: string;
  readonly authorDisplayName?: string;
  readonly body?: string;
  readonly mentions: ReadonlyArray<string>;
  readonly mentionNames: Readonly<Record<string, string>>;
  readonly editedAt?: string;
  readonly isDeleted: boolean;
  readonly attachments: ReadonlyArray<unknown>;
  readonly reactions: ReadonlyArray<unknown>;
  readonly isSaved: boolean;
  readonly replyCount: number;
  readonly references: ReadonlyArray<unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A posted message — renders one row in the thread. */
export function messageOutput(overrides: Partial<MessageOutputFixture> = {}): MessageOutputFixture {
  return {
    '@id': '/api/messages/e2e-message-1',
    '@type': 'Message',
    id: 'e2e-message-1',
    conversation: `/api/conversations/${E2E_CHANNEL_ID}`,
    authorMember: '/api/organizations/members/e2e-member-1',
    authorDisplayName: 'Ella Uzer',
    body: 'Fire extinguisher check on the north wing is done.',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: '2026-08-11T08:55:00+00:00',
    updatedAt: '2026-08-11T08:55:00+00:00',
    ...overrides,
  };
}

/** A second message from another member — exercises multi-author rendering. */
export function inspectorMessageOutput(
  overrides: Partial<MessageOutputFixture> = {},
): MessageOutputFixture {
  return messageOutput({
    id: 'e2e-message-2',
    '@id': '/api/messages/e2e-message-2',
    authorMember: '/api/organizations/members/e2e-member-2',
    authorDisplayName: 'Ines Pector',
    body: 'Noted, thanks!',
    createdAt: '2026-08-11T09:00:00+00:00',
    updatedAt: '2026-08-11T09:00:00+00:00',
    ...overrides,
  });
}

/** Subject-thread conversation the intervention discussion sheet opens for one intervention. */
export const E2E_INTERVENTION_CONVERSATION_ID = 'e2e-conv-intervention-1';

export interface ConversationOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly subjectType: string;
  readonly subject?: string;
  readonly subjectLabel?: string;
  readonly visibility: string;
  readonly lastMessageAt?: string;
  readonly messagesCount: number;
  readonly isArchived: boolean;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isChannel: boolean;
  readonly isFavorite: boolean;
}

/**
 * A subject-thread's get-or-create response — `POST /api/conversations`
 * (`ConversationService.openSubjectThread`), keyed by `subjectType`/`subject`
 * rather than by a channel name. `visibility: 'subject'` mirrors the real
 * contract: this thread's access defers to the attached record's own
 * permission, not to a participant roster.
 */
export function subjectConversationOutput(
  overrides: Partial<ConversationOutputFixture> = {},
): ConversationOutputFixture {
  return {
    '@id': `/api/conversations/${E2E_INTERVENTION_CONVERSATION_ID}`,
    '@type': 'Conversation',
    id: E2E_INTERVENTION_CONVERSATION_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    subjectType: 'intervention',
    visibility: 'subject',
    lastMessageAt: '2026-08-11T09:00:00+00:00',
    messagesCount: 2,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-08-11T08:00:00+00:00',
    updatedAt: '2026-08-11T09:00:00+00:00',
    isChannel: false,
    isFavorite: false,
    ...overrides,
  };
}
