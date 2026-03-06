/**
 * Interface PaginatedListState
 * @interface PaginatedListState
 *
 * @description
 * State interface for managing a paginated list of items in a store.
 *
 * This interface defines the basic properties needed to manage pagination, including
 * the current page of items, the total number of items across all pages, and a loading flag.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PaginatedListState<T> {
  //#region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * The list of items for the current page.
   * This should be replaced entirely when a new page is loaded, not mutated.
   *
   * @since 1.0.0
   *
   * @type {T[]} The array of items for the current page.
   */
  readonly items: T[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * The total number of items across all pages. This is used to calculate the total
   * number of pages for pagination controls.
   *
   * @since 1.0.0
   *
   * @type {number} The total number of items across all pages.
   */
  readonly total: number;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while the current page of items is being loaded. This can be used to show
   * a loading spinner or skeletons in the UI while data is being fetched.
   *
   * @since 1.0.0
   *
   * @type {boolean} True if the current page is loading, false otherwise.
   */
  readonly isLoading: boolean;

  /**
   * Property isDeleting
   * @readonly
   *
   * @description
   * True while a delete operation is in-flight. This can be used to show
   * a loading indicator or disable delete controls in the UI.
   *
   * @since 1.0.0
   *
   * @type {boolean} True if a delete is in-flight, false otherwise.
   */
  readonly isDeleting: boolean;
  //#endregion
}
