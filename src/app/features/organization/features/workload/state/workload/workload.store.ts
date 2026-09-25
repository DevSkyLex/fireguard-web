import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, EMPTY, pipe, switchMap, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
} from '@core/request-state';
import { WorkloadService } from '@features/organization/features/workload/data-access';
import type { WorkloadQuery } from '@features/organization/features/workload/models';
import { workloadStoreEvents } from './events/events';
import type { CapacityCommand } from './models/capacity-command.type';
import type { WorkloadState } from './models/workload-state.interface';

/**
 * Constant initialState
 * @const initialState
 *
 * @description
 * No capacities or availability are assumed before the first response.
 *
 * @since 1.0.0
 */
const initialState: WorkloadState = {
  query: null,
  projectionCallState: idleCallState(),
  capacityCallState: idleCallState(),
  capacityWriteCallState: idleCallState(),
  capacityScope: null,
};

/**
 * Store WorkloadStore
 * @const WorkloadStore
 *
 * @description
 * Page-scoped daily projection and capacity administration. Superseded reads
 * cancel; writes serialize and preserve drafts on failure. Changing organization clears old data.
 *
 * @since 1.0.0
 */
export const WorkloadStore = signalStore(
  withState<WorkloadState>(initialState),
  withMethods((store, service = inject(WorkloadService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Loads a window, or suspends reads offline without discarding an open draft.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {WorkloadQuery | null} query - Next scope.
     * @returns {void}
     */
    load: rxMethod<WorkloadQuery | null>(
      pipe(
        switchMap((query) => {
          if (!query) {
            patchState(store, {
              projectionCallState: { ...idleCallState(), data: store.projectionCallState().data },
            });
            return EMPTY;
          }
          const sameOrganization = store.query()?.organizationId === query.organizationId;
          const previous = sameOrganization ? store.projectionCallState().data : null;
          patchState(store, {
            ...(sameOrganization ? {} : initialState),
            query,
            projectionCallState: pendingCallState(previous),
          });
          return service.read(query).pipe(
            tapResponse({
              next: (data) => patchState(store, { projectionCallState: successCallState(data) }),
              error: (error: unknown) =>
                patchState(store, {
                  projectionCallState: errorCallState(toStoreError(error), previous),
                }),
            }),
          );
        }),
      ),
    ),

    /**
     * Method loadCapacity
     * @method loadCapacity
     *
     * @description
     * Reads one selected configuration only while its editor is open.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {WorkloadState['capacityScope']} scope - Editor scope or closed state.
     * @returns {void}
     */
    loadCapacity: rxMethod<WorkloadState['capacityScope']>(
      pipe(
        switchMap((scope) => {
          patchState(store, {
            capacityScope: scope,
            capacityCallState: scope ? pendingCallState() : idleCallState(),
            capacityWriteCallState: idleCallState(),
          });
          if (!scope) return EMPTY;
          return service.readCapacity(scope.organizationId, scope.memberId).pipe(
            tapResponse({
              next: (data) => patchState(store, { capacityCallState: successCallState(data) }),
              error: (error: unknown) =>
                patchState(store, { capacityCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    ),
  })),
  withMethods((store, service = inject(WorkloadService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Method saveCapacity
     * @method saveCapacity
     *
     * @description
     * Persists a factual capacity change even when it exposes overload.
     *
     * @access public
     * @since 1.0.0
     *
     * @param {CapacityCommand} command - Immutable write scope and input.
     * @returns {void}
     */
    saveCapacity: rxMethod<CapacityCommand>(
      pipe(
        concatMap((command) => {
          patchState(store, { capacityWriteCallState: pendingCallState() });
          let request: Observable<unknown>;
          if (command.kind === 'week') {
            request = service.saveWeek(command.organizationId, command.memberId, command.input);
          } else if (command.kind === 'exception') {
            request = service.addException(command.organizationId, command.memberId, command.input);
          } else {
            request = service.cancelException(
              command.organizationId,
              command.memberId,
              command.exceptionId,
            );
          }
          return request.pipe(
            tapResponse({
              next: () => {
                if (store.query()?.organizationId !== command.organizationId) return;
                patchState(store, { capacityWriteCallState: successCallState(null) });
                store.load(store.query());
                dispatcher.dispatch(
                  workloadStoreEvents.capacitySaved({
                    organizationId: command.organizationId,
                    memberId: command.memberId,
                  }),
                );
              },
              error: (error: unknown) => {
                if (store.query()?.organizationId === command.organizationId) {
                  patchState(store, {
                    capacityWriteCallState: errorCallState(toStoreError(error)),
                  });
                }
              },
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type WorkloadStoreType
 * @type WorkloadStoreType
 *
 * @description
 * Injected workload page store instance.
 *
 * @since 1.0.0
 */
export type WorkloadStoreType = InstanceType<typeof WorkloadStore>;
