import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { FacilityService } from '@core/services/api/facility';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  FacilityOutput,
  FacilityTypeOutput,
  CreateFacilityInput,
  UpdateFacilityInput,
  MoveFacilityInput,
} from '@core/models/facility';
import type { FacilityState } from './facility-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import { facilityStoreEvents } from './facility.events';

//#region Initial State
const INITIAL_FACILITY_STATE: FacilityState = {
  totalFacilities: 0,
  selectedFacility: null,
  listOperation: createIdleOperation(),
  getOperation: createIdleOperation(),
  createOperation: createIdleOperation(),
  updateOperation: createIdleOperation(),
  archiveOperation: createIdleOperation(),
  moveOperation: createIdleOperation(),
  facilityTypes: [],
  typesOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store FacilityStore
 * @const FacilityStore
 *
 * @description
 * NGRX SignalStore for facility management.
 * Handles facility CRUD, archiving, moving, and type reference data.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<FacilityState>(INITIAL_FACILITY_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<FacilityOutput>(), collection: 'facility' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    facilities: computed<ReadonlyArray<FacilityOutput>>(
      () => store.facilityEntities(),
    ),
    facilityTypes: computed<ReadonlyArray<FacilityTypeOutput>>(
      () => store.facilityTypes(),
    ),
    isLoadingFacilities: computed<boolean>(
      () => store.listOperation().status === 'loading',
    ),
    isLoadingFacility: computed<boolean>(
      () => store.getOperation().status === 'loading',
    ),
    isCreating: computed<boolean>(
      () => store.createOperation().status === 'loading',
    ),
    isUpdating: computed<boolean>(
      () => store.updateOperation().status === 'loading',
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    facilityService: FacilityService = inject<FacilityService>(FacilityService),
  ) => ({
    loadFacilities: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          facilityService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<FacilityOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'facility' }),
                  {
                    totalFacilities: response.totalItems,
                    listOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  listOperation: createErrorOperation(
                    operationError,
                    store.listOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load facilities'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    loadFacility: rxMethod<{ organizationId: string; facilityId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            getOperation: createLoadingOperation(store.getOperation().data),
          });
        }),
        switchMap(({ organizationId, facilityId }) =>
          facilityService.get(organizationId, facilityId).pipe(
            tapResponse({
              next: (facility: FacilityOutput) => {
                patchState(store, {
                  selectedFacility: facility,
                  getOperation: createSuccessOperation(facility),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  getOperation: createErrorOperation(
                    operationError,
                    store.getOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.getFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    create: rxMethod<{ organizationId: string; input: CreateFacilityInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          facilityService.create(organizationId, input).pipe(
            tapResponse({
              next: (facility: FacilityOutput) => {
                patchState(store,
                  addEntity(facility, { collection: 'facility' }),
                  {
                    totalFacilities: store.totalFacilities() + 1,
                    createOperation: createSuccessOperation(facility),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  createOperation: createErrorOperation(
                    operationError,
                    store.createOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    update: rxMethod<{ organizationId: string; facilityId: string; input: UpdateFacilityInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            updateOperation: createLoadingOperation(store.updateOperation().data),
          });
        }),
        exhaustMap(({ organizationId, facilityId, input }) =>
          facilityService.update(organizationId, facilityId, input).pipe(
            tapResponse({
              next: (facility: FacilityOutput) => {
                patchState(store,
                  setEntity(facility, { collection: 'facility' }),
                  {
                    selectedFacility: facility,
                    updateOperation: createSuccessOperation(facility),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  updateOperation: createErrorOperation(
                    operationError,
                    store.updateOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.updateFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to update facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    archive: rxMethod<{ organizationId: string; facilityId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            archiveOperation: createLoadingOperation(store.archiveOperation().data),
          });
        }),
        exhaustMap(({ organizationId, facilityId }) =>
          facilityService.archive(organizationId, facilityId).pipe(
            tapResponse({
              next: (facility: FacilityOutput) => {
                patchState(store,
                  setEntity(facility, { collection: 'facility' }),
                  {
                    archiveOperation: createSuccessOperation(facility),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  archiveOperation: createErrorOperation(
                    operationError,
                    store.archiveOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.archiveFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to archive facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    move: rxMethod<{ organizationId: string; facilityId: string; input: MoveFacilityInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            moveOperation: createLoadingOperation(store.moveOperation().data),
          });
        }),
        exhaustMap(({ organizationId, facilityId, input }) =>
          facilityService.move(organizationId, facilityId, input).pipe(
            tapResponse({
              next: (facility: FacilityOutput) => {
                patchState(store,
                  setEntity(facility, { collection: 'facility' }),
                  {
                    moveOperation: createSuccessOperation(facility),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  moveOperation: createErrorOperation(
                    operationError,
                    store.moveOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.moveFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to move facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    loadTypes: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, {
            typesOperation: createLoadingOperation(store.typesOperation().data),
          });
        }),
        switchMap(() =>
          facilityService.listTypes().pipe(
            tapResponse({
              next: (response: HydraCollection<FacilityTypeOutput>) => {
                patchState(store,
                  {
                    facilityTypes: [...response.member],
                    typesOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  typesOperation: createErrorOperation(
                    operationError,
                    store.typesOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  facilityStoreEvents.typesFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load facility types'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Sync Helpers ───────────────────────────────────────────────────────────

    clear(): void {
      patchState(store,
        removeAllEntities({ collection: 'facility' }),
        INITIAL_FACILITY_STATE,
      );
    },

    resetCreateOperation(): void {
      patchState(store, { createOperation: createIdleOperation() });
    },

    resetUpdateOperation(): void {
      patchState(store, { updateOperation: createIdleOperation() });
    },
  })),
  //#endregion
);

export type FacilityStore = InstanceType<typeof FacilityStore>;
