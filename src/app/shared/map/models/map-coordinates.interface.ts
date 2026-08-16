/**
 * MapCoordinates
 * @interface MapCoordinates
 *
 * @description
 * A plain WGS84 position, shared by every generic-map concept that only
 * needs "a point on Earth" — a marker's location, a requested map center, or
 * the position a click resolved to.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MapCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}
