/**
 * Interface MapMarker
 *
 * @description
 * A single located point plotted on the map. Domain-agnostic: `id` identifies
 * the marker back to the caller (emitted on selection), `longitude`/`latitude`
 * place it, and the optional `title`/`subtitle` label it. Markers without finite
 * coordinates are skipped.
 *
 * @since 1.0.0
 */
export interface MapMarker {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Opaque identifier echoed back through the map's selection output.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property longitude
   * @readonly
   *
   * @description
   * Longitude in decimal degrees.
   *
   * @type {number}
   */
  readonly longitude: number;

  /**
   * Property latitude
   * @readonly
   *
   * @description
   * Latitude in decimal degrees.
   *
   * @type {number}
   */
  readonly latitude: number;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Optional primary label for the marker.
   *
   * @type {string | undefined}
   */
  readonly title?: string;

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * Optional secondary label for the marker.
   *
   * @type {string | undefined}
   */
  readonly subtitle?: string;
}
