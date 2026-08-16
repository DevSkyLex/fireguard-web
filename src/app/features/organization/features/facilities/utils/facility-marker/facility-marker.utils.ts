import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { MapMarker } from '@shared/map';

/**
 * Function facilityToMapMarker
 *
 * @description
 * Maps a located facility onto the generic {@link MapMarker} shape the
 * `@shared/map` primitive renders: `name` becomes the label, and the only
 * lifecycle statuses a facility carries today collapse onto the primitive's
 * severity-free ends of its vocabulary — `active` reads as `neutral`,
 * `archived` as `muted`. Returns `null` for a facility missing either
 * coordinate, since `MapMarker` requires both.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {FacilityOutput} facility - The facility to map.
 *
 * @returns {MapMarker | null} The marker, or `null` when the facility has no coordinates.
 */
export function facilityToMapMarker(facility: FacilityOutput): MapMarker | null {
  if (facility.latitude == null || facility.longitude == null) return null;

  return {
    id: facility.id,
    latitude: facility.latitude,
    longitude: facility.longitude,
    statusKind: facility.status === 'archived' ? 'muted' : 'neutral',
    label: facility.name,
  };
}
