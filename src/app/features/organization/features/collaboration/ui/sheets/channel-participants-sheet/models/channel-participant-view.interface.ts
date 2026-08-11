import type { ChannelParticipantSource } from '@features/organization/features/collaboration/models';

/**
 * Interface ChannelParticipantView
 *
 * @description
 * One roster row as {@link ChannelParticipantsSheet} draws it: the raw
 * `ChannelParticipantOutput` resolved to a name and a face through the
 * member directory, the way `DirectConversationPage` resolves a counterpart.
 *
 * @since 1.0.0
 */
export interface ChannelParticipantView {
  /** Bare organization-member UUID. */
  readonly memberId: string;
  /** Never blank: falls back to a neutral label when the directory cannot resolve the member. */
  readonly displayName: string;
  readonly avatarUrl?: string;
  /** Whether {@link displayName} is a real name rather than the fallback label. */
  readonly isResolved: boolean;
  readonly role?: string;
  readonly source: ChannelParticipantSource;
}
