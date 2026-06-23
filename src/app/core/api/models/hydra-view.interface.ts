/**
 * Interface HydraView
 * @interface HydraView
 *
 * @description
 * Pagination view for Hydra collections.
 * Contains navigation links for paginated results.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const view: HydraView = {
 *   '@id': '/api/users?page=2',
 *   '@type': 'PartialCollectionView',
 *   first: '/api/users?page=1',
 *   previous: '/api/users?page=1',
 *   next: '/api/users?page=3',
 *   last: '/api/users?page=10'
 * };
 * ```
 */
export interface HydraView {
  /**
   * Property @id
   * @readonly
   *
   * @description
   * IRI of the current page in the collection.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@id': string;

  /**
   * Property @type
   * @readonly
   *
   * @description
   * View type, typically 'PartialCollectionView' for paginated results.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@type': string;

  /**
   * Property first
   * @readonly
   *
   * @description
   * IRI of the first page in the collection.
   *
   * @since 1.0.0
   *
   * @type {string | undefined}
   */
  readonly first?: string;

  /**
   * Property last
   * @readonly
   *
   * @description
   * IRI of the last page in the collection.
   *
   * @since 1.0.0
   *
   * @type {string | undefined}
   */
  readonly last?: string;

  /**
   * Property previous
   * @readonly
   *
   * @description
   * IRI of the previous page (undefined if on first page).
   *
   * @since 1.0.0
   *
   * @type {string | undefined}
   */
  readonly previous?: string;

  /**
   * Property next
   * @readonly
   *
   * @description
   * IRI of the next page (undefined if on last page).
   *
   * @since 1.0.0
   *
   * @type {string | undefined}
   */
  readonly next?: string;
}
