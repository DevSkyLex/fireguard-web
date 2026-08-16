import {
  COMPLIANCE_POSITIVE_THRESHOLD,
  COMPLIANCE_WARNING_THRESHOLD,
} from '@features/organization/features/facilities/constants';
import type { MapMarkerStatusKind } from '@shared/map';

/**
 * Function resolveComplianceBucket
 *
 * @description
 * Buckets a facility's compliance rate onto the map primitive's generic
 * severity vocabulary: `≥90` reads as `positive`, `60–89` as `warning`,
 * below `60` as `critical`, and `null` (no compliance data yet) as `muted`.
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
  if (complianceRate >= COMPLIANCE_POSITIVE_THRESHOLD) return 'positive';
  if (complianceRate >= COMPLIANCE_WARNING_THRESHOLD) return 'warning';
  return 'critical';
}
