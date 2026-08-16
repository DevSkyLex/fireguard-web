import type { MapCoordinates } from './map-coordinates.interface';
import type { MapMarkerStatusKind } from './map-marker-status-kind.type';

/**
 * MapMarker
 * @interface MapMarker
 *
 * @description
 * A single point the map primitive renders, in its generic display shape —
 * no feature import, no domain status. A consumer maps its own entity and
 * business status onto this before passing it down.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MapMarker extends MapCoordinates {
  readonly id: string;
  readonly statusKind: MapMarkerStatusKind;
  readonly label: string;
}
