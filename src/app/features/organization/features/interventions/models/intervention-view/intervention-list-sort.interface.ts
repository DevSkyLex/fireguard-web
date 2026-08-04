/**
 * Type InterventionSortField
 *
 * @description
 * The fields the collection can be ordered by. All three are already accepted
 * by the API; the page used to hard-code `createdAt` descending with no way to
 * change it.
 *
 * @since 1.0.0
 */
export type InterventionSortField = 'dueAt' | 'createdAt' | 'priority';

/**
 * Interface InterventionListSort
 * @interface InterventionListSort
 *
 * @description
 * How the collection is ordered: which field, and which way.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionListSort {
  //#region Properties
  /** Field the collection is ordered by. */
  readonly field: InterventionSortField;

  /** Direction, in the API's own vocabulary. */
  readonly direction: 'asc' | 'desc';
  //#endregion
}
