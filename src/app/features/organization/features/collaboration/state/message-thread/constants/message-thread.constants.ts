/**
 * Constant MESSAGE_PAGE_SIZE
 * @const MESSAGE_PAGE_SIZE
 *
 * @description
 * Messages fetched per page. Sent explicitly rather than left to the server
 * default, because the store derives the newest page number from
 * `totalItems / MESSAGE_PAGE_SIZE` and a page size it did not choose would make
 * that arithmetic a guess.
 *
 * Chosen well above a typical direct conversation so most threads open in one
 * request, and below the server's hard cap of 100.
 *
 * @since 2.0.0
 *
 * @type {number}
 */
export const MESSAGE_PAGE_SIZE: number = 50;

/**
 * Constant MESSAGE_REALTIME_COALESCE_MS
 * @const MESSAGE_REALTIME_COALESCE_MS
 *
 * @description
 * How long bursts of realtime frames are coalesced before the thread refetches.
 *
 * A lively conversation emits one frame per message, reaction and pin;
 * refetching per frame would turn it into a request storm for no visible gain.
 *
 * @since 2.0.0
 *
 * @type {number}
 */
export const MESSAGE_REALTIME_COALESCE_MS: number = 300;

/**
 * Constant MESSAGE_SUBSCRIPTION_REFRESH_MS
 * @const MESSAGE_SUBSCRIPTION_REFRESH_MS
 *
 * @description
 * How often the conversation's Mercure subscription token is re-minted.
 *
 * The hub issues subscriber tokens with a 15-minute lifetime and replays
 * nothing once one expires: the socket closes, every reconnection retries with
 * the same dead token, and the conversation goes quiet with no visible symptom.
 * Re-minting on a shorter cycle keeps a long-open thread live.
 *
 * @since 2.0.0
 *
 * @type {number}
 */
export const MESSAGE_SUBSCRIPTION_REFRESH_MS: number = 600_000;
