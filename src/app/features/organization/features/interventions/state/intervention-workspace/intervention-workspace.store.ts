import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, from, map, pipe, switchMap, tap, throwError } from 'rxjs';
import { ConnectivityService } from '@core/services/connectivity';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionTransitionRequest,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionWorkspaceOptimisticService } from '@features/organization/features/interventions/services/intervention-workspace-optimistic';
import type {
  InterventionDetailsUpdateCommand,
  InterventionWorkItemCreateCommand,
  InterventionWorkItemStatusCommand,
  InterventionWorkspaceState,
} from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Empty starting state for the component-scoped InterventionWorkspaceStore.
 * All collections are empty, flags default to false, and no error is set.
 *
 * @since 1.0.0
 *
 * @type {InterventionWorkspaceState}
 */
const INITIAL_STATE: InterventionWorkspaceState = {
  intervention: null,
  workItems: [],
  changes: [],
  issues: [],
  loading: false,
  saving: false,
  error: null,
};

/**
 * Function replaceWorkItem
 * @function replaceWorkItem
 *
 * @description
 * Returns a new array with the work item identified by `workItemId`
 * replaced by `replacement`. Returns the original array unchanged if no
 * matching item is found, preserving referential stability.
 *
 * @since 1.0.0
 *
 * @param {readonly InterventionWorkItemOutput[]} items - Current work-item list.
 * @param {string} workItemId - Id of the item to replace.
 * @param {InterventionWorkItemOutput} replacement - New item value to splice in.
 *
 * @return {readonly InterventionWorkItemOutput[]} Updated immutable list.
 */
function replaceWorkItem(
  items: readonly InterventionWorkItemOutput[],
  workItemId: string,
  replacement: InterventionWorkItemOutput,
): readonly InterventionWorkItemOutput[] {
  const index = items.findIndex((item) => item.id === workItemId);
  if (index < 0) return items;
  const updated: InterventionWorkItemOutput[] = [...items];
  updated[index] = replacement;
  return updated;
}

/**
 * Store InterventionWorkspaceStore
 * @const InterventionWorkspaceStore
 *
 * @description
 * Component-scoped NgRx SignalStore owning the full intervention workspace:
 * intervention details, work items, change log and quality issues.
 * Coordinates online/offline reads and optimistic writes for every field
 * action (transitions, detail updates, work-item creation and status changes).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionWorkspaceStore = signalStore(
  withState<InterventionWorkspaceState>(INITIAL_STATE),
  withComputed((store) => ({
    progress: computed<number>(() => {
      const total = store.workItems().length;
      if (total === 0) return 0;
      const done = store
        .workItems()
        .filter((item) => item.status === 'completed' || item.status === 'skipped').length;
      return Math.round((done / total) * 100);
    }),
    blockerCount: computed<number>(
      () => store.issues().filter((issue) => issue.severity === 'blocker').length,
    ),
    nextWorkItem: computed<InterventionWorkItemOutput | null>(
      () =>
        store.workItems().find((item) => item.status === 'in_progress') ??
        store.workItems().find((item) => item.status === 'planned') ??
        null,
    ),
    skippedItems: computed<readonly InterventionWorkItemOutput[]>(() =>
      store.workItems().filter((item) => item.status === 'skipped'),
    ),
    discoveredItems: computed<readonly InterventionWorkItemOutput[]>(() =>
      store.workItems().filter((item) => item.source === 'discovered'),
    ),
  })),
  withMethods(
    (
      store,
      service = inject<InterventionService>(InterventionService),
      offline = inject<InterventionOfflineService>(InterventionOfflineService),
      connectivity = inject<ConnectivityService>(ConnectivityService),
      optimistic = inject<InterventionWorkspaceOptimisticService>(
        InterventionWorkspaceOptimisticService,
      ),
    ) => {
      const load = rxMethod<string>(
        pipe(
          tap(() =>
            patchState(store, {
              intervention: null,
              workItems: [],
              changes: [],
              issues: [],
              loading: true,
              error: null,
            }),
          ),
          switchMap((interventionId) =>
            forkJoin({
              intervention: service.get(interventionId),
              workItems: service.listAllWorkItems(interventionId),
              changes: service.listAllChanges(interventionId),
              issues: service.listIssues(interventionId),
            }).pipe(
              catchError((error: unknown) =>
                connectivity.isNetworkFailure(error)
                  ? from(offline.getWorkspace(interventionId)).pipe(
                      map((workspace) => {
                        if (!workspace) throw new Error('Intervention unavailable offline');
                        return {
                          intervention: workspace.intervention,
                          workItems: workspace.workItems,
                          changes: workspace.changes,
                          issues: { member: workspace.issues },
                        };
                      }),
                    )
                  : throwError(() => error),
              ),
              tapResponse({
                next: ({ intervention, workItems, changes, issues }) => {
                  patchState(store, {
                    intervention,
                    workItems,
                    changes,
                    issues: issues.member,
                    loading: false,
                  });
                  void offline.saveWorkspace(intervention, workItems, changes, issues.member);
                },
                error: () =>
                  patchState(store, {
                    intervention: null,
                    workItems: [],
                    changes: [],
                    issues: [],
                    loading: false,
                    error: 'The intervention workspace could not be loaded.',
                  }),
              }),
            ),
          ),
        ),
      );

      return {
        load,

        transition: rxMethod<InterventionTransitionRequest>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ interventionId, status, reviewNote }) => {
              const intervention = store.intervention();
              if (connectivity.isOffline() && intervention) {
                return from(
                  offline.queue(interventionId, 'intervention.update', {
                    status,
                    reviewNote,
                    revision: intervention.revision,
                  }),
                ).pipe(
                  tap(() => {
                    const updatedIntervention = optimistic.transition(intervention, {
                      interventionId,
                      status,
                      reviewNote,
                    });
                    patchState(store, {
                      intervention: updatedIntervention,
                      saving: false,
                    });
                    void offline
                      .saveWorkspace(
                        updatedIntervention,
                        store.workItems(),
                        store.changes(),
                        store.issues(),
                        [],
                        {
                          replace: false,
                        },
                      )
                      .catch(() => undefined);
                  }),
                );
              }

              return service
                .update(interventionId, { status, reviewNote }, intervention?.revision)
                .pipe(
                  tapResponse({
                    next: (updatedIntervention) =>
                      patchState(store, { intervention: updatedIntervention, saving: false }),
                    error: () =>
                      patchState(store, {
                        saving: false,
                        error: 'The intervention status could not be updated.',
                      }),
                  }),
                );
            }),
          ),
        ),
        updateDetails: rxMethod<InterventionDetailsUpdateCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ interventionId, input }) =>
              service.update(interventionId, input, store.intervention()?.revision).pipe(
                tapResponse({
                  next: (intervention) => patchState(store, { intervention, saving: false }),
                  error: () =>
                    patchState(store, {
                      saving: false,
                      error: 'Intervention planning details could not be saved.',
                    }),
                }),
              ),
            ),
          ),
        ),

        createWorkItem: rxMethod<InterventionWorkItemCreateCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ interventionId, input }) => {
              if (connectivity.isOffline()) {
                const clientId = input.clientId ?? crypto.randomUUID();
                const localWorkItem = optimistic.createWorkItem(input, clientId);
                const intervention = store.intervention();
                return from(
                  offline.queue(interventionId, 'work-item.create', { ...input, clientId }),
                ).pipe(
                  tap(() => {
                    const workItems: readonly InterventionWorkItemOutput[] = [
                      ...store.workItems(),
                      localWorkItem,
                    ];
                    const updatedIntervention = optimistic.addWorkItem(intervention);
                    patchState(store, {
                      intervention: updatedIntervention,
                      workItems,
                      saving: false,
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          {
                            replace: false,
                          },
                        )
                        .catch(() => undefined);
                    }
                  }),
                );
              }

              return service.createWorkItem(input).pipe(
                tapResponse({
                  next: (created: InterventionWorkItemOutput) => {
                    // Append the authoritative created item (its assignee/target
                    // identities are already resolved by the API) and bump the
                    // intervention counters the same way the server does on a
                    // work item create. This avoids a full workspace reload and
                    // its loading flash.
                    const workItems: readonly InterventionWorkItemOutput[] = [
                      ...store.workItems(),
                      created,
                    ];
                    const updatedIntervention = optimistic.addWorkItem(store.intervention());
                    patchState(store, {
                      workItems,
                      intervention: updatedIntervention,
                      saving: false,
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          { replace: false },
                        )
                        .catch(() => undefined);
                    }
                  },
                  error: () =>
                    patchState(store, {
                      saving: false,
                      error: 'The work item could not be created.',
                    }),
                }),
              );
            }),
          ),
        ),
        setWorkItemStatus: rxMethod<InterventionWorkItemStatusCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ interventionId, workItemId, status, skipReason }) => {
              const item = store.workItems().find((current) => current.id === workItemId);
              const normalizedSkipReason: string | null =
                status === 'skipped' ? (skipReason ?? item?.skipReason ?? null) : null;
              if (connectivity.isOffline() && item) {
                return from(
                  offline.queue(interventionId, 'work-item.update', {
                    workItemId,
                    status,
                    skipReason: normalizedSkipReason,
                    revision: item.revision,
                  }),
                ).pipe(
                  tap(() => {
                    const result = optimistic.updateWorkItem(store.intervention(), item, {
                      workItemId,
                      status,
                      skipReason: normalizedSkipReason ?? undefined,
                    });
                    const updatedItem = result.workItem;
                    const workItems = replaceWorkItem(store.workItems(), workItemId, updatedItem);
                    const updatedIntervention = result.intervention;
                    patchState(store, {
                      intervention: updatedIntervention,
                      workItems,
                      saving: false,
                    });
                    if (updatedIntervention) {
                      void offline
                        .saveWorkspace(
                          updatedIntervention,
                          workItems,
                          store.changes(),
                          store.issues(),
                          [],
                          {
                            replace: false,
                          },
                        )
                        .catch(() => undefined);
                    }
                  }),
                );
              }

              return service
                .updateWorkItem(
                  workItemId,
                  { status, skipReason: normalizedSkipReason },
                  item?.revision,
                )
                .pipe(
                  tapResponse({
                    next: () => {
                      patchState(store, { saving: false });
                      load(interventionId);
                    },
                    error: () =>
                      patchState(store, {
                        saving: false,
                        error: 'The work item could not be updated.',
                      }),
                  }),
                );
            }),
          ),
        ),

        /**
         * Method touchOfflineIntervention
         * @method touchOfflineIntervention
         *
         * @description
         * Mirrors the server-side intervention revision increment caused by a
         * queued resource or media mutation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {Promise<void>} Resolves after the local workspace is persisted.
         */
        async touchOfflineIntervention(): Promise<void> {
          const intervention = store.intervention();
          if (!intervention) return;
          const updatedIntervention = optimistic.touch(intervention);
          patchState(store, { intervention: updatedIntervention });
          await offline.saveWorkspace(
            updatedIntervention,
            store.workItems(),
            store.changes(),
            store.issues(),
            [],
            { replace: false },
          );
        },

        /**
         * Method recordQueuedDiscovery
         * @method recordQueuedDiscovery
         *
         * @description
         * Appends a discovered work item that has already been persisted as an
         * atomic outbox intention. Updates the store optimistically and
         * persists the updated workspace to the offline cache without
         * overwriting existing operations.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {CreateInterventionWorkItemInput} input - Work-item input carrying the client-generated id.
         *
         * @return {Promise<void>} Resolves after the local workspace is persisted.
         */
        async recordQueuedDiscovery(input: CreateInterventionWorkItemInput): Promise<void> {
          const intervention = store.intervention();
          const clientId = input.clientId;
          if (!intervention || !clientId) return;

          const workItem = optimistic.createWorkItem(input, clientId);
          const workItems: readonly InterventionWorkItemOutput[] = [...store.workItems(), workItem];
          const updatedIntervention = optimistic.addWorkItem(optimistic.touch(intervention));
          patchState(store, { intervention: updatedIntervention, workItems });
          await offline.saveWorkspace(
            updatedIntervention,
            workItems,
            store.changes(),
            store.issues(),
            [],
            { replace: false },
          );
        },

        /**
         * Method clearError
         * @method clearError
         *
         * @description
         * Resets the store error to null. Typically called when the user
         * dismisses an error banner or retries a failed operation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {void}
         */
        clearError(): void {
          patchState(store, { error: null });
        },
      };
    },
  ),
);

/**
 * Type InterventionWorkspaceStoreType
 *
 * @description
 * Defines the supported intervention workspace store type values.
 */
export type InterventionWorkspaceStoreType = InstanceType<typeof InterventionWorkspaceStore>;
