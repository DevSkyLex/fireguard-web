/**
 * Constant ASSISTANT_STALL_TIMEOUT_MS
 *
 * @description
 * How long a generation may go without a frame before the panel says so.
 *
 * Entirely a client-side invention, and it has to be: the backend has no
 * cancel endpoint, no retry endpoint, no `cancelled` status, and
 * `OLLAMA_HTTP_TIMEOUT` is a per-chunk idle timeout rather than a wall clock —
 * so a reply whose worker died stays `streaming` in the database forever and
 * nothing will ever publish a `failed` frame for it. Without this the member
 * watches a spinner with no end.
 *
 * Generous on purpose: a large model on a cold start can be quiet for a while,
 * and crying wolf on a generation that is merely slow is worse than waiting.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const ASSISTANT_STALL_TIMEOUT_MS: number = 90_000;

/**
 * Constant ASSISTANT_SUBSCRIPTION_REFRESH_MS
 *
 * @description
 * How often the Mercure subscriber token is re-minted.
 *
 * The server issues it with an explicit `exp` 900 seconds out and renews
 * nothing. `MercureService` reconnects forever without surfacing an error, so
 * an expired token turns into a silent reconnect loop against a hub that
 * refuses it — a panel that looks fine and never updates again.
 *
 * Two thirds of the lifetime leaves room for a slow round trip.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const ASSISTANT_SUBSCRIPTION_REFRESH_MS: number = 600_000;
