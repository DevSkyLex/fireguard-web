import type { HydraItem } from '@core/api/models';
import type { PresenceStatus } from './presence-status.type';

/**
 * Interface PresenceOutput
 * @interface PresenceOutput
 *
 * @description
 * One member's presence, as returned by `GET /api/presence`.
 * `online` requires a live 90-second heartbeat and a visible account. Invisible,
 * expired and never-seen presences all return `online: false` without a last-seen
 * timestamp; this public projection never exposes the invisible preference.
 * One row comes back per **requested** id, in the requested order, including
 * ids the server has never heard of.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PresenceOutput extends HydraItem {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Bare member UUID. `@id` is a per-request Skolem genid — never key off it.
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property online
   * @readonly
   *
   * @description
   * Whether the server currently reports this member as visible and online.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly online: boolean;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Effective availability: the heartbeat expires independently of the global NPD preference.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {PresenceStatus}
   */
  readonly status: PresenceStatus;

  /**
   * Property lastSeenAt
   * @readonly
   *
   * @description
   * Last visible heartbeat time; the server omits this field when the member is offline.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | undefined}
   */
  readonly lastSeenAt?: string;
}

/**
 * Interface ListPresenceQuery
 * @interface ListPresenceQuery
 *
 * @description
 * Filters for `GET /api/presence`. **Both** are required — there is
 * deliberately no "list everyone online" mode.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListPresenceQuery {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Organization IRI or bare UUID.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property memberIds
   * @readonly
   *
   * @description
   * Bare member UUIDs — the provider does no IRI parsing on these, unlike
   * {@link organization}. Capped at 100 after trim and dedup.
   *
   * @type {readonly string[]}
   */
  readonly memberIds: readonly string[];
}

/**
 * Interface PingPresenceInput
 * @interface PingPresenceInput
 *
 * @description
 * Body of `POST /api/presence/ping`. The acting member is resolved
 * server-side, so there is no way to ping on someone else's behalf.
 * A malformed value answers `500`, not `400` — the parser runs outside the
 * handler's exception mapping. Send an id you already hold, never user input.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PingPresenceInput {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Organization IRI or bare UUID whose caller presence is being updated.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organization: string;
}

/**
 * Interface PingPresenceOutput
 * @interface PingPresenceOutput
 *
 * @description
 * Answer to a ping.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PingPresenceOutput extends HydraItem {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Bare member UUID — the value to feed back into `memberIds`.
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property lastSeenAt
   * @readonly
   *
   * @description
   * ISO timestamp returned by the server for the member's latest presence ping.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly lastSeenAt: string;
}
