import type { MapCoordinates } from './map-coordinates.interface';
import type { MapMarkerStatusKind } from './map-marker-status-kind.type';

/**
 * Interface MapMarker
 * @interface MapMarker
 *
 * @description
 * MapMarker
 * A single point the map primitive renders, in its generic display shape —
 * no feature import, no domain status. A consumer maps its own entity and
 * business status onto this before passing it down.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MapMarker extends MapCoordinates {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable consumer-provided key used to identify this rendered marker.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property statusKind
   * @readonly
   *
   * @description
   * Selects the marker glyph for the consumer's mapped business status.
   *
   * @access public
   * @since unreleased
   *
   * @type {MapMarkerStatusKind}
   */
  readonly statusKind: MapMarkerStatusKind;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible text naming the marker's mapped entity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;
}
