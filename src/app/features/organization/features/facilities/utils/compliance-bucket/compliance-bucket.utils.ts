import {
  COMPLIANCE_BUCKET_OK_THRESHOLD,
  COMPLIANCE_BUCKET_ATTENTION_THRESHOLD,
} from '@features/organization/constants';
import type { MapMarkerStatusKind } from '@shared/map';

/**
 * Function resolveComplianceBucket
 *
 * @description
 * Buckets a facility's compliance rate onto the map primitive's generic
 * severity vocabulary: `≥90` reads as `positive`, `60–89` as `warning`,
 * below `60` as `critical`, and `null` (no compliance data yet) as `muted`.
 * Reuses the organization feature's shared `ok`/`attention` thresholds
 * ({@link COMPLIANCE_BUCKET_OK_THRESHOLD}, {@link COMPLIANCE_BUCKET_ATTENTION_THRESHOLD})
 * under this map layer's own `positive`/`warning`/`critical` vocabulary.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number | null} complianceRate - The facility's whole-percentage compliance rate, or `null` when unknown.
 *
 * @returns {MapMarkerStatusKind} The bucket the rate falls into.
 */
export function resolveComplianceBucket(complianceRate: number | null): MapMarkerStatusKind {
  if (complianceRate === null) return 'muted';
  if (complianceRate >= COMPLIANCE_BUCKET_OK_THRESHOLD) return 'positive';
  if (complianceRate >= COMPLIANCE_BUCKET_ATTENTION_THRESHOLD) return 'warning';
  return 'critical';
}
