/**
 * Constant INTERVENTION_ATTACHMENT_QUEUE_MAX_FILES
 * @const INTERVENTION_ATTACHMENT_QUEUE_MAX_FILES
 *
 * @description
 * Device-global ceiling on queued `attachment.upload` operations. Matches the
 * backend's 25-per-intervention attachment cap so a full queue can always
 * replay, and bounds what one browser profile holds in IndexedDB.
 *
 * @since 6.0.0
 *
 * @type {number}
 */
export const INTERVENTION_ATTACHMENT_QUEUE_MAX_FILES = 25;

/**
 * Constant INTERVENTION_ATTACHMENT_QUEUE_MAX_BYTES
 * @const INTERVENTION_ATTACHMENT_QUEUE_MAX_BYTES
 *
 * @description
 * Device-global ceiling, in bytes (50 MB), on the summed size of queued
 * `attachment.upload` files. Keeps the outbox well under browser storage
 * quotas while covering a full day of compressed field photos.
 *
 * @since 6.0.0
 *
 * @type {number}
 */
export const INTERVENTION_ATTACHMENT_QUEUE_MAX_BYTES = 50 * 1024 * 1024;
