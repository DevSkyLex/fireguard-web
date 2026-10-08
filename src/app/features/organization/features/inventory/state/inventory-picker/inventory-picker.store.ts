import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Subject, pipe, switchMap, takeUntil, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { InventoryService } from '@features/organization/features/inventory/data-access';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
} from '@features/organization/features/inventory/models';

/**
 * Type InventoryPickerItem
 *
 * @description
 * Authorized reference projection shared by the two inventory choice widgets.
 *
 * @type InventoryPickerItem
 */
export type InventoryPickerItem = InventoryPartOutput | InventoryWarehouseOutput;

/**
 * Interface InventoryPickerQuery
 * @interface InventoryPickerQuery
 *
 * @description
 * Immutable server scope and candidate-page query.
 */
export interface InventoryPickerQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority for reference reads.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Reference directory to query.
   *
   * @access public
   * @since unreleased
   *
   * @type {'part' | 'warehouse'}
   */
  readonly kind: 'part' | 'warehouse';

  /**
   * Property page
   * @readonly
   *
   * @description
   * Server page starting at one.
   *
   * @access public
   * @since unreleased
   *
   * @type {number | undefined}
   */
  readonly page?: number;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Search term resolved by the server across the whole directory.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly search?: string;
}

/**
 * Interface InventoryPickerState
 * @interface InventoryPickerState
 *
 * @description
 * Independent candidate-list and selected-reference request states.
 */
interface InventoryPickerState {
  /**
   * Property query
   * @readonly
   *
   * @description
   * Current candidate scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryPickerQuery | null}
   */
  readonly query: InventoryPickerQuery | null;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Candidate page request state.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<null, import('@core/request-state').StoreError<unknown>>}
   */
  readonly listCallState: CallState;

  /**
   * Property readCallState
   * @readonly
   *
   * @description
   * Selected reference hydration independent of candidate pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<InventoryPickerItem, import('@core/request-state').StoreError<unknown>>}
   */
  readonly readCallState: CallState<InventoryPickerItem>;

  /**
   * Property total
   * @readonly
   *
   * @description
   * Authoritative matching candidate count.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly total: number;
}

/**
 * Constant initialState
 *
 * @description
 * Empty scope does not imply a successfully loaded directory.
 */
const initialState: InventoryPickerState = {
  query: null,
  listCallState: idleCallState(),
  readCallState: idleCallState(),
  total: 0,
};

/**
 * Constant InventoryPickerStore
 *
 * @description
 * Component-scoped inventory reference lookup with cancellable server reads.
 */
export const InventoryPickerStore = signalStore(
  withEntities({ entity: type<InventoryPickerItem>(), collection: 'reference' }),
  withState<InventoryPickerState>(initialState),
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 50))),
  })),
  withMethods((store, service = inject(InventoryService)) => {
    const scopeReset = new Subject<void>();
    return {
      /**
       * @description
       * Loads active candidates only and cancels obsolete search or organization reads.
       */
      load: rxMethod<InventoryPickerQuery | null>(
        pipe(
          switchMap((query) => {
            if (!query) {
              scopeReset.next();
              patchState(store, initialState, removeAllEntities({ collection: 'reference' }));
              return EMPTY;
            }
            const sameScope =
              store.query()?.organizationId === query.organizationId &&
              store.query()?.kind === query.kind;
            if (!sameScope) scopeReset.next();
            patchState(
              store,
              ...(sameScope ? [] : [initialState]),
              removeAllEntities({ collection: 'reference' }),
              { query, total: 0, listCallState: pendingCallState() },
            );
            const options = {
              page: query.page ?? 1,
              itemsPerPage: 50,
              search: query.search,
              params: { archived: false },
            };
            const request: Observable<HydraCollection<InventoryPickerItem>> =
              query.kind === 'part'
                ? service.listParts(query.organizationId, options)
                : service.listWarehouses(query.organizationId, options);
            return request.pipe(
              tapResponse({
                next: (response) =>
                  patchState(
                    store,
                    setAllEntities(
                      response.member.filter((item) => !item.archived),
                      { collection: 'reference' },
                    ),
                    { total: response.totalItems, listCallState: successCallState(null) },
                  ),
                error: (error: unknown) =>
                  patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Hydrates existing UUID values, including archived historical references.
       */
      read: rxMethod<(InventoryPickerQuery & { readonly id: string }) | null>(
        pipe(
          switchMap((scope) => {
            patchState(store, { readCallState: scope ? pendingCallState() : idleCallState() });
            if (!scope) return EMPTY;
            const request: Observable<InventoryPickerItem> =
              scope.kind === 'part'
                ? service.readPart(scope.organizationId, scope.id)
                : service.readWarehouse(scope.organizationId, scope.id);
            return request.pipe(
              takeUntil(scopeReset),
              tapResponse({
                next: (item) => patchState(store, { readCallState: successCallState(item) }),
                error: (error: unknown) =>
                  patchState(store, { readCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
    };
  }),
);

/**
 * Type InventoryPickerStoreType
 *
 * @description
 * Scoped reference-widget store instance.
 *
 * @type InventoryPickerStoreType
 */
export type InventoryPickerStoreType = InstanceType<typeof InventoryPickerStore>;
