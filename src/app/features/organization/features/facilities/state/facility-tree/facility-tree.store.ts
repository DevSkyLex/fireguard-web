import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, mergeMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityTreeStoreEvents } from './events';
import type { FacilityTreeState } from './models';

/**
 * Function withFacilityReparented
 *
 * @description
 * Pure re-parent over the tree's currently-loaded state: removes the
 * facility from wherever it was (roots or a loaded `childrenByParent`
 * bucket), then re-inserts it — with its `parentFacilityId` updated — under
 * its new parent, but only if that parent's branch is already loaded. A
 * target whose branch has not been expanded yet is left alone; the next
 * expansion fetches the accurate list from the server. Returns the inputs
 * unchanged when the facility cannot be found (nothing to move).
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} facilityId - The facility being moved.
 * @param {string | null} parentFacilityId - Its new parent, or `null` for the root.
 * @param {readonly FacilityOutput[]} roots - The current root list.
 * @param {Readonly<Record<string, readonly FacilityOutput[]>>} childrenByParent - The current loaded branches.
 *
 * @returns {{ roots: readonly FacilityOutput[]; childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>> }} The re-parented snapshot.
 */
function withFacilityReparented(
  facilityId: string,
  parentFacilityId: string | null,
  roots: readonly FacilityOutput[],
  childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>,
): {
  roots: readonly FacilityOutput[];
  childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;
} {
  let moved: FacilityOutput | undefined = roots.find((facility) => facility.id === facilityId);
  const nextChildrenByParent: Record<string, readonly FacilityOutput[]> = {};

  for (const [parentId, children] of Object.entries(childrenByParent)) {
    const found: FacilityOutput | undefined = children.find(
      (facility) => facility.id === facilityId,
    );
    if (found) moved = found;
    nextChildrenByParent[parentId] = children.filter((facility) => facility.id !== facilityId);
  }

  if (!moved) return { roots, childrenByParent };

  const relocated: FacilityOutput = { ...moved, parentFacilityId };
  let nextRoots: readonly FacilityOutput[] = roots.filter((facility) => facility.id !== facilityId);

  if (parentFacilityId === null) {
    nextRoots = [...nextRoots, relocated];
  } else if (parentFacilityId in nextChildrenByParent) {
    nextChildrenByParent[parentFacilityId] = [
      ...(nextChildrenByParent[parentFacilityId] ?? []),
      relocated,
    ];
  }

  return { roots: nextRoots, childrenByParent: nextChildrenByParent };
}

/**
 * Function withFacilityInserted
 *
 * @description
 * Pure insert over the tree's currently-loaded state: places a newly created
 * facility — the root of a fresh duplicate — into the root list, or into its
 * parent's branch if that branch is already loaded. Left alone (returned
 * unchanged) when the parent's branch has not been expanded yet; the next
 * expansion fetches the accurate list from the server.
 *
 * @access private
 * @since 1.5.0
 *
 * @param {FacilityOutput} facility - The newly created facility.
 * @param {readonly FacilityOutput[]} roots - The current root list.
 * @param {Readonly<Record<string, readonly FacilityOutput[]>>} childrenByParent - The current loaded branches.
 *
 * @returns {{ roots: readonly FacilityOutput[]; childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>> }} The updated snapshot.
 */
function withFacilityInserted(
  facility: FacilityOutput,
  roots: readonly FacilityOutput[],
  childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>,
): {
  roots: readonly FacilityOutput[];
  childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;
} {
  if (facility.parentFacilityId === null) {
    return { roots: [...roots, facility], childrenByParent };
  }

  if (facility.parentFacilityId in childrenByParent) {
    return {
      roots,
      childrenByParent: {
        ...childrenByParent,
        [facility.parentFacilityId]: [
          ...(childrenByParent[facility.parentFacilityId] ?? []),
          facility,
        ],
      },
    };
  }

  return { roots, childrenByParent };
}

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
  moveCallState: idleCallState(),
  duplicateCallState: idleCallState(),
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

    /** True while a drag-drop re-parent is in flight — locks the primitive against a second concurrent move. */
    isMoving: computed<boolean>(() => isCallPending(store.moveCallState())),

    /** True while a duplicate request is in flight — locks the menu action against a second concurrent duplicate. */
    isDuplicating: computed<boolean>(() => isCallPending(store.duplicateCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      facilityService = inject<FacilityService>(FacilityService),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      /**
       * The pre-move snapshot for each facility currently being moved, so a
       * failure can roll back the optimistic re-parent without a second fetch.
       */
      const moveSnapshots = new Map<
        string,
        {
          roots: readonly FacilityOutput[];
          childrenByParent: FacilityTreeState['childrenByParent'];
        }
      >();

      return {
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

        /**
         * Method move
         *
         * @description
         * Re-parents a facility — the shared flow behind both the tree's
         * pointer drag-drop and the keyboard/AT "Move to…" dialog action.
         * Applies the re-parent optimistically over the loaded roots and
         * branches so the row jumps immediately, then confirms with the API.
         * On failure the pre-move snapshot is restored and
         * `facilityTreeStoreEvents.moveFailed` is dispatched for the app-wide
         * feedback listener to toast — the gesture has no confirm step, so this
         * is the operator's only signal that it did not stick. Uses
         * `exhaustMap`: a second move started before the first resolves is
         * dropped rather than raced against it.
         *
         * @access public
         * @since 1.1.0
         *
         * @type {RxMethod<{ organizationId: string; facilityId: string; parentFacilityId: string | null }>}
         */
        move: rxMethod<{
          readonly organizationId: string;
          readonly facilityId: string;
          readonly parentFacilityId: string | null;
        }>(
          pipe(
            tap(({ facilityId, parentFacilityId }) => {
              const snapshot = {
                roots: store.rootsCallState().data ?? [],
                childrenByParent: store.childrenByParent(),
              };
              moveSnapshots.set(facilityId, snapshot);

              const reparented = withFacilityReparented(
                facilityId,
                parentFacilityId,
                snapshot.roots,
                snapshot.childrenByParent,
              );
              patchState(store, {
                rootsCallState: successCallState(reparented.roots),
                childrenByParent: reparented.childrenByParent,
                moveCallState: pendingCallState(),
              });
            }),
            exhaustMap(({ organizationId, facilityId, parentFacilityId }) =>
              facilityService.move(organizationId, facilityId, { parentFacilityId }).pipe(
                tapResponse({
                  next: (facility: FacilityOutput): void => {
                    moveSnapshots.delete(facilityId);
                    patchState(store, { moveCallState: successCallState(facility) });
                    dispatcher.dispatch(
                      facilityTreeStoreEvents.moveSucceeded(
                        successFeedback($localize`:@@facility.toast.moved:Facility moved`),
                      ),
                    );
                  },
                  error: (error: unknown): void => {
                    const snapshot = moveSnapshots.get(facilityId);
                    moveSnapshots.delete(facilityId);
                    const storeError = toStoreError(error);
                    patchState(store, {
                      ...(snapshot
                        ? {
                            rootsCallState: successCallState(snapshot.roots),
                            childrenByParent: snapshot.childrenByParent,
                          }
                        : {}),
                      moveCallState: errorCallState(storeError),
                    });
                    dispatcher.dispatch(
                      facilityTreeStoreEvents.moveFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to move facility'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method duplicate
         *
         * @description
         * Duplicates a facility's active subtree — the tree node menu's
         * "Duplicate" action. Fires a plain POST with no body: the copy's
         * name and parent both default server-side, and the action is not
         * destructive, so it needs no confirmation dialog. On success the
         * returned copy is inserted next to its source (root list or the
         * already-loaded parent branch); on failure
         * `facilityTreeStoreEvents.duplicateFailed` is dispatched for the
         * app-wide feedback listener to toast. Uses `mergeMap`: duplicating
         * one node must not cancel a duplicate already in flight for another.
         *
         * @access public
         * @since 1.5.0
         *
         * @type {RxMethod<{ organizationId: string; facilityId: string }>}
         */
        duplicate: rxMethod<{ readonly organizationId: string; readonly facilityId: string }>(
          pipe(
            tap(() => patchState(store, { duplicateCallState: pendingCallState() })),
            mergeMap(({ organizationId, facilityId }) =>
              facilityService.duplicate(organizationId, facilityId).pipe(
                tapResponse({
                  next: (facility: FacilityOutput): void => {
                    const inserted = withFacilityInserted(
                      facility,
                      store.rootsCallState().data ?? [],
                      store.childrenByParent(),
                    );
                    patchState(store, {
                      rootsCallState: successCallState(inserted.roots),
                      childrenByParent: inserted.childrenByParent,
                      duplicateCallState: successCallState(facility),
                    });
                    dispatcher.dispatch(
                      facilityTreeStoreEvents.duplicateSucceeded(
                        successFeedback(
                          $localize`:@@facility.toast.duplicated:Facility duplicated`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError = toStoreError(error);
                    patchState(store, { duplicateCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      facilityTreeStoreEvents.duplicateFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to duplicate facility'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),

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
