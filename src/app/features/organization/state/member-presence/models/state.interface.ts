import type { CallState } from '@core/request-state';
import type {
  PingPresenceOutput,
  PresenceOutput,
  PresenceSubscriptionOutput,
} from '@features/organization/models';

/**
 * Interface MemberPresenceEntry
 * @interface MemberPresenceEntry
 * @description A server-confirmed status with a local deadline for hiding stale snapshots.
 * @since 1.0.0
 */
export interface MemberPresenceEntry extends PresenceOutput {
  /**
   * Property freshUntil
   * @readonly
   * @description Local epoch deadline after which this snapshot is unknown.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly freshUntil: number;
}

/**
 * Interface MemberPresenceState
 * @interface MemberPresenceState
 * @description Explicit request and lifecycle state for the selected organization's presence.
 * @since 1.0.0
 */
export interface MemberPresenceState {
  readonly organizationId: string | null;
  readonly sessionRevision: number;
  readonly canRead: boolean;
  readonly running: boolean;
  readonly ownMemberId: string | null;
  readonly ownFreshUntil: number;
  readonly watched: readonly string[];
  readonly clock: number;
  readonly realtimeTopic: string | null;
  readonly listCallState: CallState<void>;
  readonly pingCallState: CallState<PingPresenceOutput>;
  readonly subscriptionCallState: CallState<PresenceSubscriptionOutput>;
}
