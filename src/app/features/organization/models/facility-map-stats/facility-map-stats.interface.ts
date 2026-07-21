/**
 * Interface FacilityMapStats
 * @interface FacilityMapStats
 *
 * @description
 * The two per-facility figures the map's sidebar cards and pins need that
 * `FacilityOutput` does not carry: compliance is owned by the backend's
 * Compliance module and only ever returned by the facility-tree endpoint, and
 * a "buildings" count has no dedicated field at all — it is derived by
 * walking that same tree's nesting.
 */
export interface FacilityMapStats {
  /** Percentage, 0–100; `null` when the facility tracks no scheduled equipment. */
  readonly complianceRate: number | null;
  /** Count of descendant facilities (any depth) of type `'building'`. */
  readonly buildingsCount: number;
}
