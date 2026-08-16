import type { MapMarker } from '../../../../../models';
import type { MarkerFeatureCollection } from '../../models/marker-feature-collection.interface';

/**
 * Function markersToGeoJson
 *
 * @description
 * Converts the primitive's generic markers into the GeoJSON
 * `FeatureCollection` maplibre's clustering source consumes. Each feature
 * carries only `markerId` — everything else a marker button needs
 * (`statusKind`, `label`) is looked up back on the original `MapMarker[]`,
 * so this stays a pure, lossless coordinate projection.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly MapMarker[]} markers - The markers to project.
 *
 * @returns {MarkerFeatureCollection} The equivalent GeoJSON collection.
 */
export function markersToGeoJson(markers: readonly MapMarker[]): MarkerFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      id: marker.id,
      properties: { markerId: marker.id },
      geometry: { type: 'Point', coordinates: [marker.longitude, marker.latitude] },
    })),
  };
}
