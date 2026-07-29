import type { HydraItem } from '@core/api/models';

/**
 * Interface PresenceOutput
 * @interface PresenceOutput
 *
 * @description
 * One member's presence, as returned by `GET /api/presence`.
 *
 * `online` is literally "a cache key written in the last 90 seconds still
 * exists" — there is no persistence behind it and no distinction between never
 * seen and seen long ago: both answer `online: false` with no
 * {@link lastSeenAt}.
 *
 * One row comes back per **requested** id, in the requested order, including
 * ids the server has never heard of.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PresenceOutput extends HydraItem {
  /** Bare member UUID. `@id` is a per-request Skolem genid — never key off it. */
  readonly memberId: string;
  readonly online: boolean;
  /** Omitted, not null, whenever the member is offline. */
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
  /** Organization IRI or bare UUID. */
  readonly organization: string;
  /**
   * Bare member UUIDs — the provider does no IRI parsing on these, unlike
   * {@link organization}. Capped at 100 after trim and dedup.
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
 *
 * A malformed value answers `500`, not `400` — the parser runs outside the
 * handler's exception mapping. Send an id you already hold, never user input.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PingPresenceInput {
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
  /** Bare member UUID — the value to feed back into `memberIds`. */
  readonly memberId: string;
  readonly lastSeenAt: string;
}
