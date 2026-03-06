import { computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { PaginatedListState } from './paginated-list-state.interface';

/**
 * Feature withPaginatedList
 * @function withPaginatedList
 *
 * @description
 * Reusable NgRx SignalStore feature for a single-page, lazy-loaded
 * PrimeNG table. Encapsulates the repeating state shape and mutation
 * helpers so each concrete table store only needs to add its own
 * entity-specific `load` and `delete` logic.
 *
 * **Provided state**
 * - `items`         — current page of entities
 * - `total`         — total matching records (used by paginator)
 * - `isLoading`     — true while a list fetch is in-flight
 * - `isDeleting`    — true while a delete is in-flight
 *
 * **Provided computed**
 * - `isEmpty` — true when `items` is empty and not loading
 *
 * **Provided mutation helpers**
 * - `setItems(items, total)` — replaces the list and clears `isLoading`
 * - `setLoading(flag)`
 * - `setDeleting(flag)`
 * - `removeItem(id)` — optimistic single removal + decrements total
 * - `removeItems(ids)` — optimistic bulk removal + decrements total
 *
 * @example
 * ```typescript
 * export const MyTableStore = signalStore(
 *   withPaginatedList<MyEntity>(),
 *   withMethods((store, svc = inject(MyService)) => ({
 *     load: rxMethod<RequestOptions>(pipe(
 *       tap(() => store.setLoading(true)),
 *       switchMap((opts) => svc.list(opts).pipe(
 *         tapResponse({
 *           next: (res) => store.setItems([...res.member], res.totalItems),
 *           error: () => store.setLoading(false),
 *         }),
 *       )),
 *     )),
 *   })),
 * );
 * ```
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withPaginatedList<T extends { id: string }>() {
  return signalStoreFeature(
    /**
     * Feature withState
     *
     * @description
     * Adds the base state properties for a paginated list: `items`, `total`,
     * `isLoading`, and `isDeleting`.
     *
     * @since 1.0.0
     *
     * @returns {PaginatedListState<T>} The initial state for the paginated list.
     */
    withState<PaginatedListState<T>>({
      items: [],
      total: 0,
      isLoading: false,
      isDeleting: false,
    }),

    /**
     * Feature withComputed
     *
     * @description
     * Adds computed properties to the store. In this case, we add `isEmpty`,
     * which is true when the list of items is empty and not currently loading.
     *
     * @since 1.0.0
     *
     * @param {SignalStore} store - The store instance to which the computed properties will be added.
     *
     * @returns {object} An object containing the computed properties to add to the store.
     */
    withComputed((store) => ({
      /**
       * Property isEmpty
       *
       * @description
       * True when the list is empty and not currently loading.
       * Useful for showing empty-state illustrations.
       *
       * @since 1.0.0
       *
       * @type {boolean} True if the list is empty and not loading, false otherwise.
       */
      isEmpty: computed<boolean>(
        () => store.items().length === 0 && !store.isLoading(),
      ),
    })),

    /**
     * Feature withMethods
     *
     * @description
     * Adds mutation helper methods to the store for
     * managing the paginated list state.
     *
     * @since 1.0.0
     *
     * @param {SignalStore} store - The store instance to which the methods will be added.
     *
     * @returns {object} An object containing the methods to add to the store.
     */
    withMethods((store) => ({
      /**
       * Method setItems
       * @method setItems
       *
       * @description
       * Replaces the current page of items and clears the loading flag.
       * Call this in the `tapResponse` next callback of `load`.
       *
       * @since 1.0.0
       *
       * @param {T[]} items - The new page of items to set in the state.
       * @param {number} total - The total number of matching records (for pagination).
       *
       * @returns {void} This method does not return anything.
       */
      setItems(items: T[], total: number): void {
        patchState(store, {
          items: items,
          total: total,
          isLoading: false
        });
      },

      /**
       * Method setLoading
       * @method setLoading
       *
       * @description
       * Sets the loading flag in the state. Call this with `true` when starting
       * a load operation, and with `false` in the error callback if the load fails.
       *
       * Note that `setItems` also sets `isLoading` to false, so you typically don't
       * need to call `setLoading(false)` in the success case.
       *
       * @since 1.0.0
       *
       * @param {boolean} isLoading - The new loading state to set.
       *
       * @returns {void} This method does not return anything.
       */
      setLoading(isLoading: boolean): void {
        patchState(store, {
          isLoading: isLoading
        });
      },

      /**
       * Method setDeleting
       * @method setDeleting
       *
       * @description
       * Turns the deleting flag on or off.
       *
       * @since 1.0.0
       *
       * @param {boolean} isDeleting - The new deleting state to set.
       *
       * @return {void} This method does not return anything.
       */
      setDeleting(isDeleting: boolean): void {
        patchState(store, {
          isDeleting: isDeleting
        });
      },

      /**
       * Method removeItem
       * @method removeItem
       *
       * @description
       * Optimistically removes a single item by id
       * and decrements the total.
       *
       * @since 1.0.0
       *
       * @param {string} id - The id of the item to remove from the list.
       *
       * @returns {void} This method does not return anything.
       */
      removeItem(id: string): void {
        patchState(store, (state) => ({
          items: state.items.filter((item) => item.id !== id),
          total: state.total - 1,
        }));
      },

      /**
       * Method removeItems
       * @method removeItems
       *
       * @description
       * Optimistically removes multiple items by id and
       * decrements the total.
       *
       * @since 1.0.0
       *
       * @param {string[]} ids - The ids of the items to remove from the list.
       *
       * @returns {void} This method does not return anything.
       */
      removeItems(ids: string[]): void {
        patchState(store, (state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
          total: state.total - ids.length,
        }));
      },
    })),
  );
}
