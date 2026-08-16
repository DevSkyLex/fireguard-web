/**
 * Constant COMPLIANCE_POSITIVE_THRESHOLD
 * @const COMPLIANCE_POSITIVE_THRESHOLD
 *
 * @description
 * Whole-percentage compliance rate at and above which a facility buckets as
 * `positive` on the map's compliance layer (`utils/compliance-bucket`).
 *
 * @since 1.0.0
 * @type {number}
 */
export const COMPLIANCE_POSITIVE_THRESHOLD: number = 90;

/**
 * Constant COMPLIANCE_WARNING_THRESHOLD
 * @const COMPLIANCE_WARNING_THRESHOLD
 *
 * @description
 * Whole-percentage compliance rate at and above which a facility buckets as
 * `warning` rather than `critical` on the map's compliance layer
 * (`utils/compliance-bucket`).
 *
 * @since 1.0.0
 * @type {number}
 */
export const COMPLIANCE_WARNING_THRESHOLD: number = 60;
