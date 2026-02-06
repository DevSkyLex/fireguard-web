import type { HydraContext } from './hydra-context.type';
import type { HydraItem } from './hydra-item.interface';
import type { HydraView } from './hydra-view.interface';
import type { HydraSearch } from './hydra-search.interface';

/**
 * Interface HydraCollection
 * @interface HydraCollection
 *
 * @description
 * Generic Hydra collection response.
 * Used for paginated list endpoints.
 *
 * @template T - The type of items in the collection (must extend HydraItem).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * interface User extends HydraItem {
 *   readonly id: string;
 *   readonly email: string;
 * }
 *
 * const users: HydraCollection<User> = {
 *   '@context': '/api/contexts/User',
 *   '@id': '/api/users',
 *   '@type': 'Collection',
 *   totalItems: 100,
 *   member: [
 *     { '@id': '/api/users/1', '@type': 'User', id: '1', email: 'john@example.com' }
 *   ],
 *   view: {
 *     '@id': '/api/users?page=1',
 *     '@type': 'PartialCollectionView',
 *     first: '/api/users?page=1',
 *     last: '/api/users?page=10',
 *     next: '/api/users?page=2'
 *   }
 * };
 * ```
 */
export interface HydraCollection<T extends HydraItem> {
  /**
   * Property @context
   * @readonly
   *
   * @description
   * JSON-LD context defining the vocabulary and term mappings.
   *
   * @since 1.0.0
   *
   * @type {HydraContext | undefined}
   */
  readonly '@context'?: HydraContext;

  /**
   * Property @id
   * @readonly
   *
   * @description
   * IRI identifier of the collection resource.
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
   * Type of the response (always 'Collection' for collections).
   *
   * @since 1.0.0
   *
   * @type {'Collection'}
   */
  readonly '@type': 'Collection';

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Total number of items in the collection across all pages.
   * Used for pagination calculations.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalItems: number;

  /**
   * Property member
   * @readonly
   *
   * @description
   * Array of items in the current page of the collection.
   *
   * @since 1.0.0
   *
   * @type {readonly T[]}
   */
  readonly member: readonly T[];

  /**
   * Property view
   * @readonly
   *
   * @description
   * Pagination view containing navigation links (first, last, next, previous).
   * Present when the collection is paginated.
   *
   * @since 1.0.0
   *
   * @type {HydraView | undefined}
   */
  readonly view?: HydraView;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Search template defining available filter parameters.
   * Present when the collection supports filtering.
   *
   * @since 1.0.0
   *
   * @type {HydraSearch | undefined}
   */
  readonly search?: HydraSearch;
}
