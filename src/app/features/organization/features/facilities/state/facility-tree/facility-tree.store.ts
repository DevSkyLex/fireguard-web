import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  exhaustMap,
  filter,
  mergeMap,
  pipe,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
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
 * @param {Readonly<Record<string, readonly FacilityOutput[]>>} childrenByParent - The current
 *   loaded branches.
 *
 * @returns {{
 *   roots: readonly FacilityOutput[];
 *   childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;
 * }}
 *   The re-parented snapshot.
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
 * @param {Readonly<Record<string, readonly FacilityOutput[]>>} childrenByParent - The current
 *   loaded branches.
 *
 * @returns {{
 *   roots: readonly FacilityOutput[];
 *   childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>;
 * }}
 *   The updated snapshot.
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
 * Constant BRANCH_PAGE_SIZE
 *
 * @description
 * Server page size for roots and individually expanded branches.
 */
const BRANCH_PAGE_SIZE = 100;

/**
 * Function appendFacilities
 *
 * @description
 * Appends a server page once per record identity, retaining the server's latest fields.
 *
 * @param {readonly FacilityOutput[]} previous - previous.
 * @param {readonly FacilityOutput[]} next - next.
 *
 * @returns {readonly FacilityOutput[]} Return value.
 */
function appendFacilities(
  previous: readonly FacilityOutput[],
  next: readonly FacilityOutput[],
): readonly FacilityOutput[] {
  return [...new Map([...previous, ...next].map((facility) => [facility.id, facility])).values()];
}

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seed state: nothing loaded, nothing expanding.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: FacilityTreeState = {
  organizationId: null,
  rootsPage: 0,
  rootsTotal: 0,
  childPagesByParent: {},
  childTotalsByParent: {},
  rootsCallState: idleCallState(),
  childrenByParent: {},
  expandingParentIds: [],
  failedParentIds: [],
  moveCallState: idleCallState(),
  moveRevisionCallState: idleCallState(),
  duplicateCallState: idleCallState(),
};

/**
 * Constant FacilityTreeStore
 *
 * Store FacilityTreeStore
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
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const FacilityTreeStore
 *
 * @example
 * ```typescript
 * @Component({ providers: [FacilityTreeStore] })
 * export class OrganizationAssetsPage {
 *   protected readonly tree = inject(FacilityTreeStore);
 * }
 * ```
 */
export const FacilityTreeStore = signalStore(
  //#region State
  withState<FacilityTreeState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * @description
     * The top of the hierarchy, empty until it resolves.
     */
    roots: computed<readonly FacilityOutput[]>(() => store.rootsCallState().data ?? []),
    /**
     * @description
     * Whether another root page exists.
     */
    canLoadMoreRoots: computed(() => store.rootsPage() * BRANCH_PAGE_SIZE < store.rootsTotal()),

    /**
     * @description
     * Whether the roots are still resolving.
     */
    isLoadingRoots: computed<boolean>(() => isCallPending(store.rootsCallState())),

    /**
     * @description
     * Whether the roots failed to load.
     */
    hasRootsError: computed<boolean>(() => isCallError(store.rootsCallState())),

    /**
     * @description
     * True while a drag-drop re-parent is in flight — locks the primitive against a second
     * concurrent move.
     */
    isMoving: computed<boolean>(
      () => isCallPending(store.moveCallState()) || isCallPending(store.moveRevisionCallState()),
    ),

    /**
     * @description
     * True while a duplicate request is in flight — locks the menu action against a second
     * concurrent duplicate.
     */
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
       * @description
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

      const refreshMoveRevision = rxMethod<{ organizationId: string; facilityId: string }>(
        pipe(
          switchMap(({ organizationId, facilityId }) => {
            patchState(store, { moveRevisionCallState: pendingCallState() });
            return facilityService.get(organizationId, facilityId).pipe(
              tapResponse({
                next: (facility: FacilityOutput) => {
                  const update = (items: readonly FacilityOutput[]) =>
                    items.map((item) => (item.id === facilityId ? facility : item));
                  patchState(store, {
                    rootsCallState: successCallState(update(store.roots())),
                    childrenByParent: Object.fromEntries(
                      Object.entries(store.childrenByParent()).map(([id, items]) => [
                        id,
                        update(items),
                      ]),
                    ),
                    moveRevisionCallState: successCallState(null),
                  });
                },
                error: (error: unknown) =>
                  patchState(store, { moveRevisionCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      );
      const scopeChanged = new Subject<void>();
      const branchInvalidated = new Subject<string>();
      const loadRootPage = rxMethod<{ organizationId: string; page: number }>(
        pipe(
          switchMap(({ organizationId, page }) => {
            if (!organizationId) return EMPTY;
            if (store.organizationId() !== organizationId) {
              scopeChanged.next();
              patchState(store, { ...INITIAL_STATE, organizationId });
            }
            const previous = page === 1 ? [] : store.roots();
            patchState(store, { rootsCallState: pendingCallState(store.roots()) });
            return facilityService
              .list(organizationId, {
                rootsOnly: true,
                page,
                itemsPerPage: BRANCH_PAGE_SIZE,
                includePath: true,
              })
              .pipe(
                tapResponse({
                  next: (collection: HydraCollection<FacilityOutput>) =>
                    patchState(store, {
                      rootsPage: page,
                      rootsTotal: collection.totalItems,
                      rootsCallState: successCallState(
                        appendFacilities(previous, collection.member),
                      ),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      rootsCallState: errorCallState(toStoreError(error), store.roots()),
                    }),
                }),
              );
          }),
        ),
      );
      const loadChildPage = rxMethod<{ organizationId: string; facilityId: string; page: number }>(
        pipe(
          mergeMap(({ organizationId, facilityId, page }) => {
            if (store.expandingParentIds().includes(facilityId)) return EMPTY;
            patchState(store, {
              expandingParentIds: [...store.expandingParentIds(), facilityId],
              failedParentIds: store.failedParentIds().filter((id) => id !== facilityId),
            });
            const previous = page === 1 ? [] : (store.childrenByParent()[facilityId] ?? []);
            return facilityService
              .listChildren(organizationId, facilityId, {
                page,
                itemsPerPage: BRANCH_PAGE_SIZE,
                includePath: true,
              })
              .pipe(
                takeUntil(scopeChanged),
                takeUntil(branchInvalidated.pipe(filter((parentId) => parentId === facilityId))),
                tapResponse({
                  next: (collection: HydraCollection<FacilityOutput>) =>
                    patchState(store, {
                      childrenByParent: {
                        ...store.childrenByParent(),
                        [facilityId]: appendFacilities(previous, collection.member),
                      },
                      childPagesByParent: { ...store.childPagesByParent(), [facilityId]: page },
                      childTotalsByParent: {
                        ...store.childTotalsByParent(),
                        [facilityId]: collection.totalItems,
                      },
                      expandingParentIds: store
                        .expandingParentIds()
                        .filter((id) => id !== facilityId),
                    }),
                  error: () =>
                    patchState(store, {
                      expandingParentIds: store
                        .expandingParentIds()
                        .filter((id) => id !== facilityId),
                      failedParentIds: [...store.failedParentIds(), facilityId],
                    }),
                }),
              );
          }),
        ),
      );
      return {
        /**
         * @description
         * Loads the first root page, retaining previous nodes on failure.
         */
        loadRoots(organizationId: string | undefined): void {
          if (organizationId) loadRootPage({ organizationId, page: 1 });
        },
        /**
         * @description
         * Loads the next root page or retries that page after failure.
         */
        loadMoreRoots(organizationId: string): void {
          if (store.canLoadMoreRoots() && !store.isLoadingRoots())
            loadRootPage({ organizationId, page: store.rootsPage() + 1 });
        },
        /**
         * @description
         * Loads a branch's first page without cancelling other expanded branches.
         * A branch invalidated by a move retains its rows until this refresh succeeds.
         */
        loadChildren(input: { organizationId: string; facilityId: string }): void {
          if (!(store.childPagesByParent()[input.facilityId] > 0))
            loadChildPage({ ...input, page: 1 });
        },
        /**
         * @description
         * Loads the next child page, including retry after a failed append.
         */
        loadMoreChildren(input: { organizationId: string; facilityId: string }): void {
          if (
            store.childPagesByParent()[input.facilityId] * BRANCH_PAGE_SIZE <
            store.childTotalsByParent()[input.facilityId]
          ) {
            loadChildPage({ ...input, page: store.childPagesByParent()[input.facilityId] + 1 });
          }
        },
        /**
         * @description
         * Reports branches that have a further server page.
         */
        canLoadMoreChildren(facilityId: string): boolean {
          return (
            (store.childPagesByParent()[facilityId] ?? 0) * BRANCH_PAGE_SIZE <
            (store.childTotalsByParent()[facilityId] ?? 0)
          );
        },
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
         *
         * @returns {boolean} Whether its children are known.
         */
        hasLoadedChildren(facilityId: string): boolean {
          return (
            facilityId in store.childrenByParent() && store.childPagesByParent()[facilityId] > 0
          );
        },

        /**
         * Method move
         *
         * @description
         * Re-parents a facility — the shared flow behind both the tree's
         * pointer drag-drop and the keyboard/AT "Move to…" dialog action.
         * Applies the re-parent optimistically over the loaded roots and
         * branches so the row jumps immediately, then confirms with the API.
         * Success restarts affected branch pages because re-parenting shifts server offsets;
         * failed refreshes retain the confirmed hierarchy and retry from the first page.
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
         * @type {RxMethod<{
         *   organizationId: string;
         *   facilityId: string;
         *   parentFacilityId: string | null;
         * }>}
         */
        move: rxMethod<{
          readonly organizationId: string;
          readonly facilityId: string;
          readonly parentFacilityId: string | null;
          readonly revision?: number;
        }>(
          pipe(
            exhaustMap(({ organizationId, facilityId, parentFacilityId, revision }) => {
              if (store.isMoving()) return EMPTY;
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
              return facilityService
                .move(
                  organizationId,
                  facilityId,
                  { parentFacilityId },
                  revision ??
                    moveSnapshots.get(facilityId)?.roots.find((item) => item.id === facilityId)
                      ?.revision ??
                    Object.values(moveSnapshots.get(facilityId)?.childrenByParent ?? {})
                      .flat()
                      .find((item) => item.id === facilityId)?.revision ??
                    0,
                )
                .pipe(
                  tapResponse({
                    next: (facility: FacilityOutput): void => {
                      moveSnapshots.delete(facilityId);
                      const previous = [
                        ...snapshot.roots,
                        ...Object.values(snapshot.childrenByParent).flat(),
                      ].find((item) => item.id === facilityId);
                      const sourceParentId = previous?.parentFacilityId ?? null;
                      const destinationParentId = facility.parentFacilityId;
                      const parentChanged = sourceParentId !== destinationParentId;
                      const affectedParents = parentChanged
                        ? [...new Set([sourceParentId, destinationParentId])]
                        : [];
                      const childPagesByParent = { ...store.childPagesByParent() };
                      const childTotalsByParent = { ...store.childTotalsByParent() };
                      const branchesToReload: string[] = [];
                      for (const parentId of affectedParents) {
                        if (parentId === null) continue;
                        if (parentId in childTotalsByParent) {
                          childTotalsByParent[parentId] = Math.max(
                            0,
                            childTotalsByParent[parentId] +
                              (parentId === destinationParentId ? 1 : -1),
                          );
                        }
                        if (
                          parentId in store.childrenByParent() ||
                          store.expandingParentIds().includes(parentId)
                        ) {
                          branchInvalidated.next(parentId);
                          childPagesByParent[parentId] = 0;
                          branchesToReload.push(parentId);
                        }
                      }
                      const update = (items: readonly FacilityOutput[]) =>
                        items.map((item) => {
                          if (item.id === facilityId) return facility;
                          if (!parentChanged) return item;
                          if (item.id === destinationParentId)
                            return { ...item, hasChildren: true };
                          if (item.id === sourceParentId && item.id in childTotalsByParent)
                            return { ...item, hasChildren: childTotalsByParent[item.id] > 0 };
                          return item;
                        });
                      patchState(store, {
                        moveCallState: successCallState(facility),
                        rootsCallState: successCallState(update(store.roots())),
                        childPagesByParent,
                        childTotalsByParent,
                        expandingParentIds: store
                          .expandingParentIds()
                          .filter((parentId) => !branchesToReload.includes(parentId)),
                        childrenByParent: Object.fromEntries(
                          Object.entries(store.childrenByParent()).map(([id, items]) => [
                            id,
                            update(items),
                          ]),
                        ),
                      });
                      dispatcher.dispatch(
                        facilityTreeStoreEvents.moveSucceeded(
                          successFeedback($localize`:@@facility.toast.moved:Facility moved`),
                        ),
                      );
                      if (affectedParents.includes(null)) {
                        patchState(store, {
                          rootsPage: 0,
                          rootsTotal: Math.max(
                            0,
                            store.rootsTotal() + (destinationParentId === null ? 1 : -1),
                          ),
                        });
                        loadRootPage({ organizationId, page: 1 });
                      }
                      for (const parentId of branchesToReload)
                        loadChildPage({ organizationId, facilityId: parentId, page: 1 });
                    },
                    error: (error: unknown): void => {
                      const rollbackSnapshot = moveSnapshots.get(facilityId);
                      moveSnapshots.delete(facilityId);
                      const storeError = toStoreError(error);
                      patchState(store, {
                        ...(rollbackSnapshot
                          ? {
                              rootsCallState: successCallState(rollbackSnapshot.roots),
                              childrenByParent: rollbackSnapshot.childrenByParent,
                            }
                          : {}),
                        moveCallState: errorCallState(storeError),
                      });
                      if (storeError.code === 412 || storeError.code === 428) {
                        refreshMoveRevision({ organizationId, facilityId });
                      }
                      dispatcher.dispatch(
                        facilityTreeStoreEvents.moveFailed(
                          toStoreFailureEventPayload(storeError, 'Failed to move facility'),
                        ),
                      );
                    },
                  }),
                );
            }),
          ),
        ),
        /**
         * @description
         * Clears the previous move result when opening the next dialog.
         */
        resetMoveOperation(): void {
          patchState(store, {
            moveCallState: idleCallState(),
            moveRevisionCallState: idleCallState(),
          });
        },

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
     * @param {{ organizationId: string; facilityId: string }} params - Organization and parent
     *   facility identifiers.
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
 *
 * @type {FacilityTreeStoreType}
 */
export type FacilityTreeStoreType = InstanceType<typeof FacilityTreeStore>;
