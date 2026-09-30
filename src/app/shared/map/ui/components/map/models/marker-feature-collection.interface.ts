/**
 * Interface MarkerFeatureCollection
 * @interface MarkerFeatureCollection
 *
 * @description
 * MarkerFeatureCollection
 * The minimal GeoJSON shape this primitive feeds into maplibre's clustering
 * source — typed locally rather than pulling the `geojson` package in for
 * three fields.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkerFeatureCollection {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Identifies the collection using the GeoJSON FeatureCollection discriminator.
   *
   * @access public
   * @since unreleased
   *
   * @type {'FeatureCollection'}
   */
  readonly type: 'FeatureCollection';

  /**
   * Property features
   * @readonly
   *
   * @description
   * GeoJSON points supplied to the map source for rendering and clustering.
   *
   * @access public
   * @since unreleased
   *
   * @type {ReadonlyArray<{
   *   readonly type: 'Feature';
   *   readonly id: string;
   *   readonly properties: { readonly markerId: string };
   *   readonly geometry: {
   *     readonly type: 'Point';
   *     readonly coordinates: readonly [number, number];
   *   };
   * }>}
   */
  readonly features: ReadonlyArray<{
    readonly type: 'Feature';
    readonly id: string;
    readonly properties: { readonly markerId: string };
    readonly geometry: { readonly type: 'Point'; readonly coordinates: readonly [number, number] };
  }>;
}
