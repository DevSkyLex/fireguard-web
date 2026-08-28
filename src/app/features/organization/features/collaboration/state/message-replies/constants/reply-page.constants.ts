/**
 * Constant REPLY_PAGE_SIZE
 * @const REPLY_PAGE_SIZE
 *
 * @description
 * Replies fetched in the single read the sheet performs — the server's hard
 * cap, so all but pathological threads arrive whole. Replies page oldest-first
 * like messages do, so a longer thread would truncate at its newest end; the
 * parent's `replyCount` still reports the real total.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const REPLY_PAGE_SIZE: number = 100;
