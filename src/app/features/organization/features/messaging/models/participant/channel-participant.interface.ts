import type { HydraItem } from '@core/api/models';

/**
 * How a member came to be in a channel.
 *
 * `direct` was added by hand, `team` was pulled in by a team binding — the
 * distinction matters because a team-sourced participant reappears when the
 * team changes, so removing them by hand is not durable.
 *
 * @since 1.0.0
 */
export type ChannelParticipantSource = 'direct' | 'team';

/**
 * A member of a channel.
 *
 * Carries no identity beyond `memberId`: names and avatars are resolved
 * through `OrganizationMemberDirectoryStore`, the same way message authors
 * are.
 *
 * @since 1.0.0
 */
export interface ChannelParticipant extends HydraItem {
  readonly memberId: string;
  readonly role: string | null;
  readonly source: ChannelParticipantSource;
  readonly addedAt: string;
}
