import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityTreeNode,
  FacilityTreeOutput,
} from '@features/organization/features/facilities/models';

/**
 * Store FacilityTreeStore
 * @const FacilityTreeStore
 *
 * @description
 * Component-scoped store for the facility hierarchy view. Loads the whole
 * nested tree in one call, so there is no per-node lazy loading and no page
 * cursor to keep in sync.
 *
 * Deliberately separate from `FacilityStore`: that one owns the flat, paginated
 * roots listing behind a different permission (`facilities.read` vs
 * `compliance.read`). Merging them would make one cache hold the same rows in
 * two shapes.
 *
 * @example
 * ```typescript
 * @Component({ providers: [FacilityTreeStore] })
 * export class FacilityListPage {
 *   protected readonly tree = inject(FacilityTreeStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityTreeStore = signalStore(
  //#region State
  withQueryState<FacilityTreeOutput>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed nodes
     *
     * @description
     * Root nodes of the hierarchy, each nesting its own children.
     *
     * @type {Signal<readonly FacilityTreeNode[]>}
     */
    nodes: computed<readonly FacilityTreeNode[]>(() => store.queryData()?.nodes ?? []),

    /**
     * Computed isEmpty
     *
     * @description
     * `true` once a successful load returned no root at all — distinct from
     * "still loading", so the view can tell an empty organization apart from a
     * pending request.
     *
     * @type {Signal<boolean>}
     */
    isEmpty: computed<boolean>(
      () => store.isQueryLoaded() && (store.queryData()?.nodes.length ?? 0) === 0,
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(FacilityService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the hierarchy for an organization. A `null` id is ignored so the
     * caller can bind a route signal directly without guarding it.
     *
     * @param {string | null} organizationId - The organization to load.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.getTree(organizationId).pipe(
            tapResponse({
              next: (tree: FacilityTreeOutput) => patchState(store, setSuccessQuery(tree)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type FacilityTreeStoreType
 *
 * @description
 * Injectable instance type of {@link FacilityTreeStore}.
 */
export type FacilityTreeStoreType = InstanceType<typeof FacilityTreeStore>;
