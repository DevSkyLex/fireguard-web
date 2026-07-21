/**
 * Interface MapMarkerDetail
 *
 * @description
 * One generic label/value pair rendered in a marker's popup body, under its
 * title and subtitle. Domain-agnostic on purpose — the caller decides what a
 * "detail" means (a count, a rate, a status word).
 *
 * @since 1.2.0
 */
export interface MapMarkerDetail {
  /** Short label for the detail line, e.g. `"Equipment"`. */
  readonly label: string;
  /** Pre-formatted value for the detail line, e.g. `"128"`. */
  readonly value: string;
}

/**
 * Interface MapMarker
 *
 * @description
 * A single located point plotted on the map. Domain-agnostic: `id` identifies
 * the marker back to the caller (emitted on selection), `longitude`/`latitude`
 * place it, and the optional `title`/`subtitle` label it. Markers without finite
 * coordinates are skipped. `color`, `draggable` and `details` are optional,
 * generic presentation hooks the caller fills with whatever domain meaning it
 * wants (a severity bucket, a repositioning affordance, a popup breakdown).
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

  /**
   * Property color
   * @readonly
   *
   * @description
   * Optional CSS color overriding this pin's fill; falls back to the default
   * brand accent when omitted. Never the only carrier of meaning — pair a
   * color with a label somewhere the caller controls (e.g. in `details` or the
   * consuming list), since the map itself renders no text next to the pin.
   *
   * @type {string | undefined}
   */
  readonly color?: string;

  /**
   * Property draggable
   * @readonly
   *
   * @description
   * Whether this pin can be repositioned by dragging. Defaults to `false`. A
   * completed drag emits `markerDragEnd` with the marker's new position; the
   * caller owns persisting it.
   *
   * @type {boolean | undefined}
   */
  readonly draggable?: boolean;

  /**
   * Property details
   * @readonly
   *
   * @description
   * Optional label/value pairs rendered in this marker's popup body, under the
   * title and subtitle.
   *
   * @type {readonly MapMarkerDetail[] | undefined}
   */
  readonly details?: readonly MapMarkerDetail[];
}
