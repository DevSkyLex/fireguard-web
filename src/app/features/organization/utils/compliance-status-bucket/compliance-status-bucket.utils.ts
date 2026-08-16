import {
  COMPLIANCE_BUCKET_ATTENTION_THRESHOLD,
  COMPLIANCE_BUCKET_OK_THRESHOLD,
} from '@features/organization/constants';
import type { ComplianceBucket } from '@features/organization/models';

/**
 * Function resolveComplianceBucket
 *
 * @description
 * Grades a compliance rate into the estate explorer's severity bucket:
 * `ok` at or above {@link COMPLIANCE_BUCKET_OK_THRESHOLD}, `attention` at or
 * above {@link COMPLIANCE_BUCKET_ATTENTION_THRESHOLD}, `critical` below it,
 * and `unknown` for `null` — a node with no tracked equipment is undefined,
 * never critical.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number | null} rate - The compliance rate (0-100), or `null` when undefined.
 *
 * @returns {ComplianceBucket} The matching severity bucket.
 */
export function resolveComplianceBucket(rate: number | null): ComplianceBucket {
  if (rate === null) return 'unknown';
  if (rate >= COMPLIANCE_BUCKET_OK_THRESHOLD) return 'ok';
  if (rate >= COMPLIANCE_BUCKET_ATTENTION_THRESHOLD) return 'attention';
  return 'critical';
}
