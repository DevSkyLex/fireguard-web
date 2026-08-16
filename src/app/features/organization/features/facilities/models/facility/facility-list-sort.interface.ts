import type { SortDirection } from '@core/api';

/**
 * Type FacilitySortField
 *
 * @description
 * The fields the root-facility collection can be ordered by — the backend's
 * own sort whitelist for `GET /api/organizations/{organizationId}/facilities`
 * (`ListFacilitiesProvider`), passed through as `order[field]` with no
 * mapping.
 *
 * @since 1.4.0
 */
export type FacilitySortField = 'name' | 'type' | 'status' | 'createdAt' | 'updatedAt' | 'code';

/**
 * Interface FacilityListSort
 * @interface FacilityListSort
 *
 * @description
 * How the root-facility collection is ordered: which field, and which way.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityListSort {
  //#region Properties
  /** Field the collection is ordered by. */
  readonly field: FacilitySortField;

  /** Direction, in the API's own vocabulary. */
  readonly direction: SortDirection;
  //#endregion
}
