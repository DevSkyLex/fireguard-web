import type { CallState } from '@core/request-state';
import type {
  PingPresenceOutput,
  PresenceOutput,
  PresenceSubscriptionOutput,
} from '@features/organization/models';

/**
 * Interface MemberPresenceEntry
 * @interface MemberPresenceEntry
 *
 * @description
 * A server-confirmed status with a local deadline for hiding stale snapshots.
 *
 * @since 1.0.0
 */
export interface MemberPresenceEntry extends PresenceOutput {
  /**
   * Property freshUntil
   * @readonly
   *
   * @description
   * Local epoch deadline after which this snapshot is unknown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly freshUntil: number;
}

/**
 * Interface MemberPresenceState
 * @interface MemberPresenceState
 *
 * @description
 * Explicit request and lifecycle state for the selected organization's presence.
 *
 * @since 1.0.0
 */
export interface MemberPresenceState {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization currently supplying presence snapshots, or null when cleared.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Authenticated session revision that owns the current presence lifecycle.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly sessionRevision: number;

  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Whether the caller is permitted to read organization member presence.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly canRead: boolean;

  /**
   * Property running
   * @readonly
   *
   * @description
   * Whether polling or realtime presence observation is active.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly running: boolean;

  /**
   * Property ownMemberId
   * @readonly
   *
   * @description
   * Current member identifier used to exclude the caller from remote reads.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly ownMemberId: string | null;

  /**
   * Property ownFreshUntil
   * @readonly
   *
   * @description
   * Deadline after which the local caller presence snapshot is considered stale.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly ownFreshUntil: number;

  /**
   * Property watched
   * @readonly
   *
   * @description
   * Member identifiers with an active presence watch.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly string[]}
   */
  readonly watched: readonly string[];

  /**
   * Property clock
   * @readonly
   *
   * @description
   * Current local clock value used to evaluate presence freshness.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly clock: number;

  /**
   * Property realtimeTopic
   * @readonly
   *
   * @description
   * Private Mercure topic for the active organization presence stream, when connected.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly realtimeTopic: string | null;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Outcome of the watched-member presence snapshot request.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<void>}
   */
  readonly listCallState: CallState<void>;

  /**
   * Property pingCallState
   * @readonly
   *
   * @description
   * Outcome of publishing the caller’s presence heartbeat.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<PingPresenceOutput>}
   */
  readonly pingCallState: CallState<PingPresenceOutput>;

  /**
   * Property subscriptionCallState
   * @readonly
   *
   * @description
   * Outcome of connecting to the organization presence stream.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<PresenceSubscriptionOutput>}
   */
  readonly subscriptionCallState: CallState<PresenceSubscriptionOutput>;
}
