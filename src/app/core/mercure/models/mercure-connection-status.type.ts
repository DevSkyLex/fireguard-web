/**
 * Type MercureConnectionStatus
 * @typedef MercureConnectionStatus
 *
 * @description
 * Health of one topic's Server-Sent Events connection.
 *
 * `reconnecting` covers both the browser's own retry and ours: from a
 * consumer's point of view the distinction is noise — updates are not flowing
 * and something is trying to fix it.
 *
 * @since 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type MercureConnectionStatus = 'connecting' | 'connected' | 'reconnecting';
