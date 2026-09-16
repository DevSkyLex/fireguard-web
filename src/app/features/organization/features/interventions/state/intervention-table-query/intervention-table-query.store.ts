import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, from, map, of, pipe, switchMap, throwError, timer } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import {
  InterventionService,
  InterventionOfflineService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionChangeOutput,
  InterventionChangeTableQuery,
  InterventionWorkItemOutput,
  InterventionWorkItemTableQuery,
} from '@features/organization/features/interventions/models';
import type { InterventionWorkspaceData } from '@features/organization/features/interventions/models';
import {
  projectInterventionWorkspace,
  searchSavedWorkItems,
  searchSavedChanges,
} from '@features/organization/features/interventions/utils';
import type { InterventionTableQueryState, InterventionTableRequest } from './models';

/**
 * Constant INITIAL_STATE
 * @description Criteria and independent request lifecycles scoped to one detail page.
 * @since 6.2.0
 * @type {InterventionTableQueryState}
 */
const INITIAL_STATE: InterventionTableQueryState = {
  contextId: null,
  offline: false,
  workItemsSource: 'api',
  changesSource: 'api',
  activeTable: null,
  workItemsInterventionId: null,
  workItemsCallState: idleCallState(),
  workItemsQuery: { search: '', statuses: null },
  workItemsGeneration: 0,
  workItemsVisited: false,
  workItemsInvalidated: false,
  changesInterventionId: null,
  changesCallState: idleCallState(),
  changesQuery: { search: '', status: 'proposed' },
  changesGeneration: 0,
  changesVisited: false,
  changesInvalidated: false,
};

/**
 * Store InterventionTableQueryStore
 * @description Owns controlled criteria and cancellable server queries, independently of the
 * complete workspace snapshot. Only user text edits debounce; activation, refresh and retry do not.
 * @since 6.2.0
 */
export const InterventionTableQueryStore = signalStore(
  withState<InterventionTableQueryState>(INITIAL_STATE),
  withComputed((store) => ({
    workItems: computed(() => store.workItemsCallState().data),
    workItemsLoading: computed(() => isCallPending(store.workItemsCallState())),
    workItemsError: computed(() => store.workItemsCallState().error),
    changes: computed(() => store.changesCallState().data),
    changesLoading: computed(() => isCallPending(store.changesCallState())),
    changesError: computed(() => store.changesCallState().error),
  })),
  withMethods(
    (
      store,
      service = inject(InterventionService),
      offline = inject(InterventionOfflineService),
      connectivity = inject(ConnectivityService),
    ) => {
      /** Reads complete persisted data and overlays operations which may not yet be in that snapshot. */
      async function savedWorkspace(interventionId: string): Promise<InterventionWorkspaceData> {
        const [snapshot, operations] = await Promise.all([
          offline.getWorkspace(interventionId),
          offline.listOutbox(interventionId),
        ]);
        if (!snapshot)
          throw new Error(
            $localize`:@@intervention.tables.offlineUnavailable:This intervention has not been saved on this device. Reconnect to load its tables.`,
          );
        return projectInterventionWorkspace(snapshot, operations);
      }
      const requestWorkItems =
        rxMethod<InterventionTableRequest<InterventionWorkItemTableQuery> | null>(
          pipe(
            switchMap((request) => {
              if (!request) return EMPTY;
              const { interventionId, criteria, generation, delay } = request;
              const current = (): boolean =>
                store.contextId() === interventionId && store.workItemsGeneration() === generation;
              return (delay ? timer(delay) : of(0)).pipe(
                switchMap(() => {
                  const saved = () =>
                    from(savedWorkspace(interventionId)).pipe(
                      map((workspace) => ({
                        rows: searchSavedWorkItems(workspace.workItems, criteria),
                        source: 'saved' as const,
                      })),
                    );
                  return store.offline()
                    ? saved()
                    : service
                        .listAllWorkItems(interventionId, {
                          search: criteria.search.trim() || undefined,
                          status: criteria.statuses ?? undefined,
                        })
                        .pipe(
                          map((rows) => ({ rows, source: 'api' as const })),
                          catchError((error: unknown) =>
                            connectivity.isNetworkFailure(error)
                              ? saved()
                              : throwError(() => error),
                          ),
                        );
                }),
                tapResponse({
                  next: ({ rows, source }) => {
                    if (current())
                      patchState(store, {
                        workItemsCallState: successCallState(rows),
                        workItemsSource: source,
                        workItemsInvalidated: false,
                      });
                  },
                  error: (error: unknown) => {
                    if (current())
                      patchState(store, {
                        workItemsSource: store.offline() ? 'unavailable' : store.workItemsSource(),
                        workItemsCallState: errorCallState(
                          toStoreError(error),
                          store.workItemsCallState().data,
                        ),
                      });
                  },
                }),
              );
            }),
          ),
        );
      const requestChanges =
        rxMethod<InterventionTableRequest<InterventionChangeTableQuery> | null>(
          pipe(
            switchMap((request) => {
              if (!request) return EMPTY;
              const { interventionId, criteria, generation, delay } = request;
              const current = (): boolean =>
                store.contextId() === interventionId && store.changesGeneration() === generation;
              return (delay ? timer(delay) : of(0)).pipe(
                switchMap(() => {
                  const saved = () =>
                    from(savedWorkspace(interventionId)).pipe(
                      map((workspace) => ({
                        rows: searchSavedChanges(workspace.changes, criteria, workspace.workItems),
                        source: 'saved' as const,
                      })),
                    );
                  return store.offline()
                    ? saved()
                    : service
                        .listAllChanges(interventionId, {
                          search: criteria.search.trim() || undefined,
                          status: criteria.status ?? undefined,
                        })
                        .pipe(
                          map((rows) => ({ rows, source: 'api' as const })),
                          catchError((error: unknown) =>
                            connectivity.isNetworkFailure(error)
                              ? saved()
                              : throwError(() => error),
                          ),
                        );
                }),
                tapResponse({
                  next: ({ rows, source }) => {
                    if (current())
                      patchState(store, {
                        changesCallState: successCallState(rows),
                        changesSource: source,
                        changesInvalidated: false,
                      });
                  },
                  error: (error: unknown) => {
                    if (current())
                      patchState(store, {
                        changesSource: store.offline() ? 'unavailable' : store.changesSource(),
                        changesCallState: errorCallState(
                          toStoreError(error),
                          store.changesCallState().data,
                        ),
                      });
                  },
                }),
              );
            }),
          ),
        );

      /**
       * Function setContext
       * @description Cancels both streams immediately and clears criteria only on intervention change.
       * @param {string} interventionId - Current route context.
       * @returns {void}
       * @since 6.2.0
       */
      function setContext(interventionId: string): void {
        if (store.contextId() === interventionId) return;
        requestWorkItems(null);
        requestChanges(null);
        patchState(store, {
          ...INITIAL_STATE,
          offline: store.offline(),
          contextId: interventionId,
          workItemsGeneration: store.workItemsGeneration() + 1,
          changesGeneration: store.changesGeneration() + 1,
        });
      }

      /**
       * Function loadWorkItems
       * @description Accepts controlled Work criteria and cancels the previous execution before waiting.
       * @param {InterventionWorkItemTableQuery & { interventionId: string }} query - Requested criteria.
       * @param {boolean} force - Bypass identical-criteria deduplication and debounce.
       * @returns {void}
       * @since 6.2.0
       */
      function loadWorkItems(
        query: InterventionWorkItemTableQuery & { interventionId: string },
        force: boolean = false,
      ): void {
        setContext(query.interventionId);
        const previous = store.workItemsQuery();
        const sameStatus = (previous.statuses ?? []).join('|') === (query.statuses ?? []).join('|');
        const sameSearch = previous.search.trim() === query.search.trim();
        const visited = store.workItemsVisited();
        const criteria: InterventionWorkItemTableQuery = {
          search: query.search,
          statuses: query.statuses,
        };
        patchState(store, { workItemsQuery: criteria });
        if (!force && visited && sameStatus && sameSearch) return;
        const generation = store.workItemsGeneration() + 1;
        patchState(store, {
          workItemsInterventionId: query.interventionId,
          workItemsVisited: true,
          workItemsGeneration: generation,
          workItemsInvalidated: false,
          workItemsCallState: pendingCallState(store.workItemsCallState().data),
        });
        requestWorkItems({
          interventionId: query.interventionId,
          criteria,
          generation,
          delay: !force && (!visited || sameStatus) && !sameSearch && query.search.trim() ? 300 : 0,
        });
      }

      /**
       * Function loadChanges
       * @description Accepts controlled Changes criteria; facet changes always take effect immediately.
       * @param {InterventionChangeTableQuery & { interventionId: string }} query - Requested criteria.
       * @param {boolean} force - Bypass identical-criteria deduplication and debounce.
       * @returns {void}
       * @since 6.2.0
       */
      function loadChanges(
        query: InterventionChangeTableQuery & { interventionId: string },
        force: boolean = false,
      ): void {
        setContext(query.interventionId);
        const previous = store.changesQuery();
        const sameStatus = previous.status === query.status;
        const sameSearch = previous.search.trim() === query.search.trim();
        const visited = store.changesVisited();
        const criteria: InterventionChangeTableQuery = {
          search: query.search,
          status: query.status,
        };
        patchState(store, { changesQuery: criteria });
        if (!force && visited && sameStatus && sameSearch) return;
        const generation = store.changesGeneration() + 1;
        patchState(store, {
          changesInterventionId: query.interventionId,
          changesVisited: true,
          changesGeneration: generation,
          changesInvalidated: false,
          changesCallState: pendingCallState(store.changesCallState().data),
        });
        requestChanges({
          interventionId: query.interventionId,
          criteria,
          generation,
          delay: !force && (!visited || sameStatus) && !sameSearch && query.search.trim() ? 300 : 0,
        });
      }

      /**
       * Function refreshWorkItems
       * @description Forces an API read with the saved Work criteria, including after an error.
       * @returns {void}
       * @since 6.2.0
       */
      function refreshWorkItems(): void {
        const interventionId = store.contextId();
        if (interventionId) loadWorkItems({ interventionId, ...store.workItemsQuery() }, true);
      }

      /**
       * Function refreshChanges
       * @description Forces an API read with the saved Changes criteria, including after an error.
       * @returns {void}
       * @since 6.2.0
       */
      function refreshChanges(): void {
        const interventionId = store.contextId();
        if (interventionId) loadChanges({ interventionId, ...store.changesQuery() }, true);
      }

      return {
        setContext,
        /** Switches provenance, cancels obsolete requests and invalidates only visited tables. */
        setOffline(offlineMode: boolean, refresh: boolean = true): void {
          if (store.offline() === offlineMode) return;
          requestWorkItems(null);
          requestChanges(null);
          patchState(store, {
            offline: offlineMode,
            workItemsGeneration: store.workItemsGeneration() + 1,
            changesGeneration: store.changesGeneration() + 1,
            workItemsInvalidated: store.workItemsVisited(),
            changesInvalidated: store.changesVisited(),
          });
          if (refresh && store.activeTable() === 'workItems') refreshWorkItems();
          if (refresh && store.activeTable() === 'changes') refreshChanges();
        },
        loadWorkItems,
        loadChanges,
        refreshWorkItems,
        refreshChanges,
        retryWorkItems: refreshWorkItems,
        retryChanges: refreshChanges,
        /**
         * Method activateWorkItems
         * @description Initializes business defaults once, then reuses criteria and valid cached rows.
         * @param {string} interventionId - Current intervention.
         * @param {InterventionWorkItemTableQuery} initial - First activation defaults.
         * @returns {void}
         * @since 6.2.0
         */
        activateWorkItems(interventionId: string, initial: InterventionWorkItemTableQuery): void {
          setContext(interventionId);
          patchState(store, { activeTable: 'workItems' });
          if (!store.workItemsVisited()) loadWorkItems({ interventionId, ...initial }, true);
          else if (store.workItemsInvalidated()) refreshWorkItems();
        },
        /**
         * Method activateChanges
         * @description Initializes history defaults once and refreshes invalidated history on activation.
         * @param {string} interventionId - Current intervention.
         * @param {InterventionChangeTableQuery} initial - First activation defaults.
         * @returns {void}
         * @since 6.2.0
         */
        activateChanges(interventionId: string, initial: InterventionChangeTableQuery): void {
          setContext(interventionId);
          patchState(store, { activeTable: 'changes' });
          if (!store.changesVisited()) loadChanges({ interventionId, ...initial }, true);
          else if (store.changesInvalidated()) refreshChanges();
        },
        /**
         * Method deactivate
         * @description Retains visited criteria while another panel is active.
         * @returns {void}
         * @since 6.2.0
         */
        deactivate(): void {
          patchState(store, { activeTable: null });
        },
        /**
         * Method invalidate
         * @description Refreshes only the affected active table; other visited tables reload on activation.
         * @param {string} interventionId - Mutation owner.
         * @param {readonly string[]} collections - Invalidated collections.
         * @returns {void}
         * @since 6.2.0
         */
        invalidate(interventionId: string, collections: readonly string[]): void {
          if (store.contextId() !== interventionId) return;
          if (collections.includes('workItems')) {
            patchState(store, { workItemsInvalidated: true });
            if (store.activeTable() === 'workItems') refreshWorkItems();
            else {
              requestWorkItems(null);
              patchState(store, { workItemsGeneration: store.workItemsGeneration() + 1 });
            }
          }
          if (collections.includes('changes')) {
            patchState(store, { changesInvalidated: true });
            if (store.activeTable() === 'changes') refreshChanges();
            else {
              requestChanges(null);
              patchState(store, { changesGeneration: store.changesGeneration() + 1 });
            }
          }
        },
        /**
         * Method reconcileWorkItem
         * @description Updates an affected visible row without replacing server rows with a workspace snapshot.
         * @param {InterventionWorkItemOutput} item - Successful mutation result.
         * @returns {void}
         * @since 6.2.0
         */
        reconcileWorkItem(item: InterventionWorkItemOutput): void {
          if (item.intervention !== '/api/interventions/' + store.contextId()) return;
          const state = store.workItemsCallState();
          if (state.data)
            patchState(store, {
              workItemsCallState: {
                ...state,
                data: state.data.map((row) => (row.id === item.id ? item : row)),
              },
            });
        },
        /**
         * Method reconcileChange
         * @description Applies a changed row before the API recalculates membership.
         * @param {InterventionChangeOutput} change - Successful mutation result.
         * @returns {void}
         * @since 6.2.0
         */
        reconcileChange(change: InterventionChangeOutput): void {
          if (change.intervention !== '/api/interventions/' + store.contextId()) return;
          const state = store.changesCallState();
          if (state.data)
            patchState(store, {
              changesCallState: {
                ...state,
                data: state.data.map((row) => (row.id === change.id ? change : row)),
              },
            });
        },
        /**
         * Method removeWorkItems
         * @description Removes remotely deleted rows without disturbing the rest of the current query.
         * @param {string} interventionId - Mutation owner.
         * @param {readonly string[]} ids - Deleted identifiers.
         * @returns {void}
         * @since 6.2.0
         */
        removeWorkItems(interventionId: string, ids: readonly string[]): void {
          if (store.contextId() !== interventionId) return;
          const state = store.workItemsCallState();
          if (state.data)
            patchState(store, {
              workItemsCallState: {
                ...state,
                data: state.data.filter((row) => !ids.includes(row.id)),
              },
            });
        },
      };
    },
  ),
);

/**
 * Type InterventionTableQueryStoreType
 * @description Injectable instance of the page-owned table-query store.
 * @since 6.2.0
 * @type {InstanceType<typeof InterventionTableQueryStore>}
 */
export type InterventionTableQueryStoreType = InstanceType<typeof InterventionTableQueryStore>;
