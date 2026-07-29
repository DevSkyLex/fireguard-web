/**
 * Constant PRESENCE_PING_INTERVAL_MS
 *
 * @description
 * How often the acting member announces themselves.
 *
 * Bounded on both sides. The server forgets a member after 90 seconds, so
 * pinging less often would make an active member flicker offline; the endpoint
 * allows 6 requests per minute per user and organization, so pinging more
 * often leaves no headroom for a member with several tabs open.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const PRESENCE_PING_INTERVAL_MS: number = 60_000;

/**
 * Constant PRESENCE_POLL_INTERVAL_MS
 *
 * @description
 * How often other members' presence is re-read.
 *
 * Reads are not rate-limited, but there is no push channel for presence — no
 * Mercure topic carries it — so this interval is the whole resolution of the
 * feature. Half the server's 90 second window keeps a member from appearing
 * online for up to a minute after they left.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const PRESENCE_POLL_INTERVAL_MS: number = 45_000;

/**
 * Constant PRESENCE_PING_BACKOFF_MS
 *
 * @description
 * How long pinging pauses after a `429`.
 *
 * Longer than the ping interval on purpose: being rate-limited means several
 * tabs are already announcing this member, so the right response is to stop
 * competing rather than to retry sooner.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const PRESENCE_PING_BACKOFF_MS: number = 180_000;
