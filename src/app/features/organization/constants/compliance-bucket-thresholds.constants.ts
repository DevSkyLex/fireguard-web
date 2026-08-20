/**
 * Constant COMPLIANCE_BUCKET_OK_THRESHOLD
 *
 * @description
 * The minimum compliance rate (inclusive) graded "ok". Also the single
 * source of the equivalent `positive` cutoff the facilities feature's
 * `resolveComplianceBucket` (`facilities/utils/compliance-bucket`) applies
 * under the map primitive's own `positive`/`warning`/`critical` vocabulary —
 * the two utils derive different bucket labels from the same numbers.
 *
 * @since 1.0.0
 */
export const COMPLIANCE_BUCKET_OK_THRESHOLD = 90;

/**
 * Constant COMPLIANCE_BUCKET_ATTENTION_THRESHOLD
 *
 * @description
 * The minimum compliance rate (inclusive) graded "attention"; below it is
 * "critical". Also the single source of the equivalent `warning` cutoff the
 * facilities feature's `resolveComplianceBucket`
 * (`facilities/utils/compliance-bucket`) applies under the map primitive's
 * own `positive`/`warning`/`critical` vocabulary.
 *
 * @since 1.0.0
 */
export const COMPLIANCE_BUCKET_ATTENTION_THRESHOLD = 60;
