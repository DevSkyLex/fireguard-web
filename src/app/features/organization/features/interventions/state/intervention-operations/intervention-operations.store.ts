import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { defer, EMPTY, mergeMap, pipe } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import type { InterventionOperationsState } from './models/state.interface';

/** Store InterventionOperationsStore
 * @description Reads and retries only the active intervention queue. Conflict retries require an explicit UI confirmation.
 * @since 1.0.0
 */
export const InterventionOperationsStore = signalStore(
  withState<InterventionOperationsState>({
    organizationId: '',
    interventionId: '',
    operations: [],
    loadCallState: idleCallState(),
    mutations: {},
  }),
  withComputed((store) => ({
    blocked: computed(() =>
      store
        .operations()
        .filter((operation) => operation.status === 'failed' || operation.status === 'conflict'),
    ),
    queuedWorkItemIds: computed(
      () =>
        new Set(
          store
            .operations()
            .flatMap((operation) =>
              'workItemId' in operation.payload && operation.payload.workItemId
                ? [operation.payload.workItemId]
                : [],
            ),
        ),
    ),
  })),
  withMethods(
    (
      store,
      offline = inject(InterventionOfflineService),
      sync = inject(InterventionSyncCoordinatorService),
    ) => {
      let generation = 0;
      /** Method load
       * @description Refreshes local operations, ignoring responses from another account or workspace.
       * @access public
       * @since 1.0.0
       * @param {{ organizationId: string; interventionId: string }} context - Workspace scope.
       * @returns {void}
       */
      const load = rxMethod<{ organizationId: string; interventionId: string }>(
        pipe(
          mergeMap((context) => {
            const expected = ++generation;
            const owner = offline.publicationOwner();
            const changed =
              context.organizationId !== store.organizationId() ||
              context.interventionId !== store.interventionId();
            patchState(store, context, {
              loadCallState: pendingCallState(),
              ...(changed ? { operations: [], mutations: {} } : {}),
            });
            return defer(() => offline.listOutbox(context.interventionId)).pipe(
              tapResponse({
                next: (operations) => {
                  if (expected === generation && owner === offline.publicationOwner())
                    patchState(store, { operations, loadCallState: successCallState(null) });
                },
                error: (error: unknown) => {
                  if (expected === generation && owner === offline.publicationOwner())
                    patchState(store, { loadCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      return {
        load,
        /** Method resolve
         * @description Applies a confirmed operation decision, then refreshes this queue. No other intervention is retried or discarded.
         * @access public
         * @since 1.0.0
         * @param {{ id: string; action: 'retry' | 'discard' }} request - Explicit operation decision.
         * @returns {void}
         */
        resolve: rxMethod<{ id: string; action: 'retry' | 'discard' }>(
          pipe(
            mergeMap(({ id, action }) => {
              if (
                !store.operations().some((operation) => operation.id === id) ||
                store.mutations()[id]?.status === 'pending'
              )
                return EMPTY;
              const context = {
                organizationId: store.organizationId(),
                interventionId: store.interventionId(),
              };
              const owner = offline.publicationOwner();
              const current = (): boolean =>
                context.interventionId === store.interventionId() &&
                context.organizationId === store.organizationId() &&
                owner === offline.publicationOwner();
              patchState(store, { mutations: { ...store.mutations(), [id]: pendingCallState() } });
              return defer(async () => {
                if (action === 'discard') await offline.removeOutbox(id);
                else await offline.retryOutbox(id);
                if (!current()) return;
                if (action === 'retry')
                  await sync.syncIntervention(context.organizationId, context.interventionId);
                else await sync.refreshStatus();
              }).pipe(
                tapResponse({
                  next: () => {
                    if (!current()) return;
                    patchState(store, {
                      mutations: { ...store.mutations(), [id]: successCallState(null) },
                    });
                    load(context);
                  },
                  error: (error: unknown) => {
                    if (!current()) return;
                    patchState(store, {
                      mutations: {
                        ...store.mutations(),
                        [id]: errorCallState(toStoreError(error)),
                      },
                    });
                    load(context);
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
);
