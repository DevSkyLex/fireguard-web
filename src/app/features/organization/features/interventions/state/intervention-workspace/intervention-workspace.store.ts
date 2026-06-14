import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, from, map, pipe, switchMap, tap, throwError } from 'rxjs';
import { ConnectivityService } from '@core/services/connectivity';
import { MissionService } from '@features/organization/features/missions/data-access';
import type {
  CreateMissionWorkItemInput,
  MissionTransitionRequest,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';
import { MissionOfflineService } from '@features/organization/features/missions/services';
import { MissionWorkspaceOptimisticService } from '@features/organization/features/missions/services/mission-workspace-optimistic';
import type {
  MissionDetailsUpdateCommand,
  MissionWorkItemCreateCommand,
  MissionWorkItemStatusCommand,
  MissionWorkspaceState,
} from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Provides the initial state value.
 *
 * @since 1.0.0
 *
 * @type {MissionWorkspaceState}
 */
const INITIAL_STATE: MissionWorkspaceState = {
  mission: null,
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
 * Executes the replace work item operation.
 *
 * @since 1.0.0
 *
 * @param {readonly MissionWorkItemOutput[]} items - items value.
 * @param {string} workItemId - work Item Id value.
 * @param {MissionWorkItemOutput} replacement - replacement value.
 *
 * @return {readonly MissionWorkItemOutput[]} Result of the replace work item operation.
 */
function replaceWorkItem(
  items: readonly MissionWorkItemOutput[],
  workItemId: string,
  replacement: MissionWorkItemOutput,
): readonly MissionWorkItemOutput[] {
  const index = items.findIndex((item) => item.id === workItemId);
  if (index < 0) return items;
  const updated: MissionWorkItemOutput[] = [...items];
  updated[index] = replacement;
  return updated;
}

/**
 * Constant MissionWorkspaceStore
 * @const MissionWorkspaceStore
 *
 * @description
 * Provides the mission workspace store value.
 *
 * @since 1.0.0
 *
 * @type {SignalStore}
 */
export const MissionWorkspaceStore = signalStore(
  withState<MissionWorkspaceState>(INITIAL_STATE),
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
    nextWorkItem: computed<MissionWorkItemOutput | null>(
      () =>
        store.workItems().find((item) => item.status === 'in_progress') ??
        store.workItems().find((item) => item.status === 'planned') ??
        null,
    ),
    skippedItems: computed<readonly MissionWorkItemOutput[]>(() =>
      store.workItems().filter((item) => item.status === 'skipped'),
    ),
    discoveredItems: computed<readonly MissionWorkItemOutput[]>(() =>
      store.workItems().filter((item) => item.source === 'discovered'),
    ),
  })),
  withMethods(
    (
      store,
      service = inject(MissionService),
      offline = inject(MissionOfflineService),
      connectivity = inject(ConnectivityService),
      optimistic = inject(MissionWorkspaceOptimisticService),
    ) => {
      const load = rxMethod<string>(
        pipe(
          tap(() =>
            patchState(store, {
              mission: null,
              workItems: [],
              changes: [],
              issues: [],
              loading: true,
              error: null,
            }),
          ),
          switchMap((missionId) =>
            forkJoin({
              mission: service.get(missionId),
              workItems: service.listAllWorkItems(missionId),
              changes: service.listAllChanges(missionId),
              issues: service.listIssues(missionId),
            }).pipe(
              catchError((error: unknown) =>
                connectivity.isNetworkFailure(error)
                  ? from(offline.getWorkspace(missionId)).pipe(
                      map((workspace) => {
                        if (!workspace) throw new Error('Mission unavailable offline');
                        return {
                          mission: workspace.mission,
                          workItems: workspace.workItems,
                          changes: workspace.changes,
                          issues: { member: workspace.issues },
                        };
                      }),
                    )
                  : throwError(() => error),
              ),
              tapResponse({
                next: ({ mission, workItems, changes, issues }) => {
                  patchState(store, {
                    mission,
                    workItems,
                    changes,
                    issues: issues.member,
                    loading: false,
                  });
                  void offline.saveWorkspace(mission, workItems, changes, issues.member);
                },
                error: () =>
                  patchState(store, {
                    mission: null,
                    workItems: [],
                    changes: [],
                    issues: [],
                    loading: false,
                    error: 'The mission workspace could not be loaded.',
                  }),
              }),
            ),
          ),
        ),
      );

      return {
        load,

        transition: rxMethod<MissionTransitionRequest>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ missionId, status, reviewNote }) => {
              const mission = store.mission();
              if (connectivity.isOffline() && mission) {
                return from(
                  offline.queue(missionId, 'mission.update', {
                    status,
                    reviewNote,
                    revision: mission.revision,
                  }),
                ).pipe(
                  tap(() => {
                    const updatedMission = optimistic.transition(mission, {
                      missionId,
                      status,
                      reviewNote,
                    });
                    patchState(store, {
                      mission: updatedMission,
                      saving: false,
                    });
                    void offline
                      .saveWorkspace(
                        updatedMission,
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

              return service.update(missionId, { status, reviewNote }, mission?.revision).pipe(
                tapResponse({
                  next: (updatedMission) =>
                    patchState(store, { mission: updatedMission, saving: false }),
                  error: () =>
                    patchState(store, {
                      saving: false,
                      error: 'The mission status could not be updated.',
                    }),
                }),
              );
            }),
          ),
        ),
        updateDetails: rxMethod<MissionDetailsUpdateCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ missionId, input }) =>
              service.update(missionId, input, store.mission()?.revision).pipe(
                tapResponse({
                  next: (mission) => patchState(store, { mission, saving: false }),
                  error: () =>
                    patchState(store, {
                      saving: false,
                      error: 'Mission planning details could not be saved.',
                    }),
                }),
              ),
            ),
          ),
        ),

        createWorkItem: rxMethod<MissionWorkItemCreateCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ missionId, input }) => {
              if (connectivity.isOffline()) {
                const clientId = input.clientId ?? crypto.randomUUID();
                const localWorkItem = optimistic.createWorkItem(input, clientId);
                const mission = store.mission();
                return from(
                  offline.queue(missionId, 'work-item.create', { ...input, clientId }),
                ).pipe(
                  tap(() => {
                    const workItems: readonly MissionWorkItemOutput[] = [
                      ...store.workItems(),
                      localWorkItem,
                    ];
                    const updatedMission = optimistic.addWorkItem(mission);
                    patchState(store, {
                      mission: updatedMission,
                      workItems,
                      saving: false,
                    });
                    if (updatedMission) {
                      void offline
                        .saveWorkspace(
                          updatedMission,
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
                  next: () => {
                    patchState(store, { saving: false });
                    load(missionId);
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
        setWorkItemStatus: rxMethod<MissionWorkItemStatusCommand>(
          pipe(
            tap(() => patchState(store, { saving: true, error: null })),
            switchMap(({ missionId, workItemId, status, skipReason }) => {
              const item = store.workItems().find((current) => current.id === workItemId);
              const normalizedSkipReason: string | null =
                status === 'skipped' ? (skipReason ?? item?.skipReason ?? null) : null;
              if (connectivity.isOffline() && item) {
                return from(
                  offline.queue(missionId, 'work-item.update', {
                    workItemId,
                    status,
                    skipReason: normalizedSkipReason,
                    revision: item.revision,
                  }),
                ).pipe(
                  tap(() => {
                    const result = optimistic.updateWorkItem(store.mission(), item, {
                      workItemId,
                      status,
                      skipReason: normalizedSkipReason ?? undefined,
                    });
                    const updatedItem = result.workItem;
                    const workItems = replaceWorkItem(store.workItems(), workItemId, updatedItem);
                    const updatedMission = result.mission;
                    patchState(store, {
                      mission: updatedMission,
                      workItems,
                      saving: false,
                    });
                    if (updatedMission) {
                      void offline
                        .saveWorkspace(
                          updatedMission,
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
                      load(missionId);
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
         * Method touchOfflineMission
         * @method touchOfflineMission
         *
         * @description
         * Mirrors the server-side mission revision increment caused by a
         * queued resource or media mutation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {Promise<void>} Resolves after the local workspace is persisted.
         */
        async touchOfflineMission(): Promise<void> {
          const mission = store.mission();
          if (!mission) return;
          const updatedMission = optimistic.touch(mission);
          patchState(store, { mission: updatedMission });
          await offline.saveWorkspace(
            updatedMission,
            store.workItems(),
            store.changes(),
            store.issues(),
            [],
            { replace: false },
          );
        },

        /**
         * Adds a discovery already persisted as an atomic outbox intention.
         */
        async recordQueuedDiscovery(input: CreateMissionWorkItemInput): Promise<void> {
          const mission = store.mission();
          const clientId = input.clientId;
          if (!mission || !clientId) return;

          const workItem = optimistic.createWorkItem(input, clientId);
          const workItems: readonly MissionWorkItemOutput[] = [...store.workItems(), workItem];
          const updatedMission = optimistic.addWorkItem(optimistic.touch(mission));
          patchState(store, { mission: updatedMission, workItems });
          await offline.saveWorkspace(
            updatedMission,
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
         * Executes the clear error operation.
         *
         * @access public
         * @since 1.0.0
         *
         * @return {void} Result of the clear error operation.
         */
        clearError(): void {
          patchState(store, { error: null });
        },
      };
    },
  ),
);

/**
 * Type MissionWorkspaceStoreType
 *
 * @description
 * Defines the supported mission workspace store type values.
 */
export type MissionWorkspaceStoreType = InstanceType<typeof MissionWorkspaceStore>;
