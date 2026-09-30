/**
 * Interface MapCoordinates
 * @interface MapCoordinates
 *
 * @description
 * MapCoordinates
 * A plain WGS84 position, shared by every generic-map concept that only
 * needs "a point on Earth" — a marker's location, a requested map center, or
 * the position a click resolved to.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MapCoordinates {
  /**
   * Property latitude
   * @readonly
   *
   * @description
   * WGS84 latitude in decimal degrees for the map position.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly latitude: number;

  /**
   * Property longitude
   * @readonly
   *
   * @description
   * WGS84 longitude in decimal degrees for the map position.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly longitude: number;
}
