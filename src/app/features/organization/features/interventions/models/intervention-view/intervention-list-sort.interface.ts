/**
 * Type InterventionSortField
 *
 * @description
 * The fields the collection can be ordered by — the useful subset of the
 * API's own sort whitelist (`name`, `status`, `type`, `priority`,
 * `plannedStartAt`, `dueAt`, `createdAt`, `updatedAt`), passed through as
 * `order[field]` with no mapping.
 *
 * @since 1.0.0
 */
export type InterventionSortField =
  | 'name'
  | 'dueAt'
  | 'plannedStartAt'
  | 'createdAt'
  | 'updatedAt'
  | 'priority';

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
