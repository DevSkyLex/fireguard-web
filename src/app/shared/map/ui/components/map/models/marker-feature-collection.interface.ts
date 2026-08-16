/**
 * MarkerFeatureCollection
 * @interface MarkerFeatureCollection
 *
 * @description
 * The minimal GeoJSON shape this primitive feeds into maplibre's clustering
 * source — typed locally rather than pulling the `geojson` package in for
 * three fields.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkerFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<{
    readonly type: 'Feature';
    readonly id: string;
    readonly properties: { readonly markerId: string };
    readonly geometry: { readonly type: 'Point'; readonly coordinates: readonly [number, number] };
  }>;
}
