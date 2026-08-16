import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityTreeState } from './models';

/**
 * How many sites one branch may hold before the rest is left unfetched. Deep
 * hierarchies are normal; a single node with hundreds of direct children is
 * not, and paging a tree branch would be a worse answer than not offering it.
 */
const BRANCH_PAGE_SIZE = 100;

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seed state: nothing loaded, nothing expanding.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: FacilityTreeState = {
  rootsCallState: idleCallState(),
  childrenByParent: {},
  expandingParentIds: [],
  failedParentIds: [],
};

/**
 * Store FacilityTreeStore
 * @const FacilityTreeStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the asset explorer's site tree.
 *
 * It loads the roots once, then one branch per expansion. `mergeMap` rather
 * than `switchMap` on the branch call: expanding a second node must not cancel
 * the first, which `switchMap` would do and which reads as a branch that
 * silently never opens.
 *
 * A branch is fetched once and kept. Collapsing and re-expanding a node is a
 * navigation gesture, not a reason to ask the server again.
 *
 * @example
 * ```typescript
 * @Component({ providers: [FacilityTreeStore] })
 * export class OrganizationAssetsPage {
 *   protected readonly tree = inject(FacilityTreeStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityTreeStore = signalStore(
  //#region State
  withState<FacilityTreeState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** The top of the hierarchy, empty until it resolves. */
    roots: computed<readonly FacilityOutput[]>(() => store.rootsCallState().data ?? []),

    /** Whether the roots are still resolving. */
    isLoadingRoots: computed<boolean>(() => isCallPending(store.rootsCallState())),

    /** Whether the roots failed to load. */
    hasRootsError: computed<boolean>(() => isCallError(store.rootsCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods((store, facilityService = inject<FacilityService>(FacilityService)) => ({
    /**
     * Method loadRoots
     *
     * @description
     * Loads the sites with no parent. A missing organization is a no-op.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {rxMethod<string | undefined>}
     */
    loadRoots: rxMethod<string | undefined>(
      pipe(
        switchMap((organizationId: string | undefined) => {
          if (!organizationId) return EMPTY;

          patchState(store, { rootsCallState: pendingCallState(store.rootsCallState().data) });

          return facilityService
            .list(organizationId, { rootsOnly: true, itemsPerPage: BRANCH_PAGE_SIZE })
            .pipe(
              tapResponse({
                next: (collection: HydraCollection<FacilityOutput>): void => {
                  patchState(store, { rootsCallState: successCallState(collection.member) });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    rootsCallState: errorCallState(
                      toStoreError(error),
                      store.rootsCallState().data,
                    ),
                  });
                },
              }),
            );
        }),
      ),
    ),

    /**
     * Method loadChildren
     *
     * @description
     * Loads one node's direct children, once. A branch already fetched — or
     * already in flight — is left alone.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {rxMethod<{ organizationId: string; facilityId: string }>}
     */
    loadChildren: rxMethod<{ readonly organizationId: string; readonly facilityId: string }>(
      pipe(
        tap(({ facilityId }) => {
          patchState(store, {
            expandingParentIds: [...store.expandingParentIds(), facilityId],
            failedParentIds: store.failedParentIds().filter((id) => id !== facilityId),
          });
        }),
        mergeMap(({ organizationId, facilityId }) =>
          facilityService
            .listChildren(organizationId, facilityId, { itemsPerPage: BRANCH_PAGE_SIZE })
            .pipe(
              tapResponse({
                next: (collection: HydraCollection<FacilityOutput>): void => {
                  patchState(store, {
                    childrenByParent: {
                      ...store.childrenByParent(),
                      [facilityId]: collection.member,
                    },
                    expandingParentIds: store
                      .expandingParentIds()
                      .filter((id) => id !== facilityId),
                  });
                },
                error: (): void => {
                  patchState(store, {
                    expandingParentIds: store
                      .expandingParentIds()
                      .filter((id) => id !== facilityId),
                    failedParentIds: [...store.failedParentIds(), facilityId],
                  });
                },
              }),
            ),
        ),
      ),
    ),

    /**
     * Method hasLoadedChildren
     *
     * @description
     * Whether a node's branch has already been fetched, so the caller can skip
     * a second request on re-expansion.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {string} facilityId - Node to check.
     * @returns {boolean} Whether its children are known.
     */
    hasLoadedChildren(facilityId: string): boolean {
      return facilityId in store.childrenByParent();
    },
  })),

  withMethods((store) => ({
    /**
     * Method ensureChildrenLoaded
     *
     * @description
     * Guarded loader for a node's direct children, mirroring
     * `FacilityStore.ensureChildFacilitiesLoaded`. No-ops when the branch is
     * already loaded or is currently in flight, so the tree's `expandRequested`
     * output can call this unconditionally without ever issuing a duplicate
     * request on re-expansion.
     *
     * @access public
     * @since 1.1.0
     *
     * @param {{ organizationId: string; facilityId: string }} params - Organization and parent facility identifiers.
     *
     * @returns {void}
     */
    ensureChildrenLoaded(params: {
      readonly organizationId: string;
      readonly facilityId: string;
    }): void {
      const { facilityId } = params;
      if (
        facilityId in store.childrenByParent() ||
        store.expandingParentIds().includes(facilityId)
      ) {
        return;
      }

      store.loadChildren(params);
    },
  })),
  //#endregion
);

/**
 * Type FacilityTreeStoreType
 *
 * @description
 * Instance type of the {@link FacilityTreeStore} signal store.
 *
 * @version 1.0.0
 */
export type FacilityTreeStoreType = InstanceType<typeof FacilityTreeStore>;
