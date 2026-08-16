import type { SortDirection } from '@core/api';

/**
 * Type InspectionSortField
 *
 * @description
 * The fields the collection can be ordered by — the backend's
 * `ListInspectionsProvider` sort whitelist (`result`, `status`, `performedAt`,
 * `createdAt`), passed through as `order[field]` with no mapping.
 *
 * @since 1.4.0
 */
export type InspectionSortField = 'result' | 'status' | 'performedAt' | 'createdAt';

/**
 * Interface InspectionListSort
 * @interface InspectionListSort
 *
 * @description
 * How the collection is ordered: which field, and which way.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InspectionListSort {
  //#region Properties
  /** Field the collection is ordered by. */
  readonly field: InspectionSortField;

  /** Direction, in the API's own vocabulary. */
  readonly direction: SortDirection;
  //#endregion
}
