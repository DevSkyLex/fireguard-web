import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { MapMarker } from '@shared/map';
import { resolveComplianceBucket } from '../compliance-bucket/compliance-bucket.utils';

/**
 * Function facilityToComplianceMapMarker
 *
 * @description
 * Maps a located facility onto the generic {@link MapMarker} shape for the
 * map's compliance layer: `statusKind` comes from
 * {@link resolveComplianceBucket} instead of the facility's lifecycle
 * status, and the rate is folded into the label itself
 * (`"{name} — {rate}% compliant"`) so the compliance signal is never
 * colour/glyph-only (`PRODUCT.md`). Returns `null` for a facility missing
 * either coordinate, since `MapMarker` requires both.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {FacilityOutput} facility - The facility to map.
 * @param {number | null} complianceRate - Its compliance rate, or `null` when unknown.
 *
 * @returns {MapMarker | null} The marker, or `null` when the facility has no coordinates.
 */
export function facilityToComplianceMapMarker(
  facility: FacilityOutput,
  complianceRate: number | null,
): MapMarker | null {
  if (facility.latitude == null || facility.longitude == null) return null;

  const label: string =
    complianceRate === null
      ? $localize`:@@facility.map.compliance.markerLabelNoData:${facility.name}:facilityName: — no compliance data`
      : $localize`:@@facility.map.compliance.markerLabel:${facility.name}:facilityName: — ${complianceRate}:rate:% compliant`;

  return {
    id: facility.id,
    latitude: facility.latitude,
    longitude: facility.longitude,
    statusKind: resolveComplianceBucket(complianceRate),
    label,
  };
}
