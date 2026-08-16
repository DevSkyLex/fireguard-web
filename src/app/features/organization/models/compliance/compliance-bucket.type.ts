/**
 * Type ComplianceBucket
 *
 * @description
 * The compliance-rate severity bucket driving the estate explorer's
 * compliance badge: `ok` (>= 90), `attention` (60-89), `critical` (< 60), or
 * `unknown` when the rate is `null` (no tracked equipment).
 */
export type ComplianceBucket = 'ok' | 'attention' | 'critical' | 'unknown';
