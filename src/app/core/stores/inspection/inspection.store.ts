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
import { InspectionService } from '@core/services/api/inspection';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  InspectionOutput,
  CreateInspectionInput,
  NonConformityOutput,
  AddNonConformityInput,
  UpdateNonConformityStatusInput,
} from '@core/models/inspection';
import type { InspectionState } from './inspection-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import { inspectionStoreEvents } from './inspection.events';

//#region Initial State
const INITIAL_INSPECTION_STATE: InspectionState = {
  totalInspections: 0,
  selectedInspection: null,
  listOperation: createIdleOperation(),
  getOperation: createIdleOperation(),
  createOperation: createIdleOperation(),
  submitOperation: createIdleOperation(),
  closeOperation: createIdleOperation(),
  totalNonConformities: 0,
  nonConformitiesListOperation: createIdleOperation(),
  addNonConformityOperation: createIdleOperation(),
  updateNonConformityStatusOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store InspectionStore
 * @const InspectionStore
 *
 * @description
 * NGRX SignalStore for inspection management.
 * Handles inspection lifecycle and non-conformity tracking.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InspectionStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<InspectionState>(INITIAL_INSPECTION_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<InspectionOutput>(), collection: 'inspection' }),
  withEntities({ entity: type<NonConformityOutput>(), collection: 'nonConformity' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    inspections: computed<ReadonlyArray<InspectionOutput>>(
      () => store.inspectionEntities(),
    ),
    nonConformities: computed<ReadonlyArray<NonConformityOutput>>(
      () => store.nonConformityEntities(),
    ),
    isLoadingInspections: computed<boolean>(
      () => store.listOperation().status === 'loading',
    ),
    isLoadingInspection: computed<boolean>(
      () => store.getOperation().status === 'loading',
    ),
    isCreating: computed<boolean>(
      () => store.createOperation().status === 'loading',
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    inspectionService: InspectionService = inject<InspectionService>(InspectionService),
  ) => ({
    // ── Inspections ────────────────────────────────────────────────────────

    loadInspections: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          inspectionService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<InspectionOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'inspection' }),
                  {
                    totalInspections: response.totalItems,
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
                  listOperation: createErrorOperation(operationError, store.listOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load inspections'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    loadInspection: rxMethod<{ organizationId: string; inspectionId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            getOperation: createLoadingOperation(store.getOperation().data),
          });
        }),
        switchMap(({ organizationId, inspectionId }) =>
          inspectionService.get(organizationId, inspectionId).pipe(
            tapResponse({
              next: (inspection: InspectionOutput) => {
                patchState(store, {
                  selectedInspection: inspection,
                  getOperation: createSuccessOperation(inspection),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  getOperation: createErrorOperation(operationError, store.getOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.getFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load inspection'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    create: rxMethod<{ organizationId: string; input: CreateInspectionInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          inspectionService.create(organizationId, input).pipe(
            tapResponse({
              next: (inspection: InspectionOutput) => {
                patchState(store,
                  addEntity(inspection, { collection: 'inspection' }),
                  {
                    totalInspections: store.totalInspections() + 1,
                    createOperation: createSuccessOperation(inspection),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  createOperation: createErrorOperation(operationError, store.createOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create inspection'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    submit: rxMethod<{ organizationId: string; inspectionId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            submitOperation: createLoadingOperation(store.submitOperation().data),
          });
        }),
        exhaustMap(({ organizationId, inspectionId }) =>
          inspectionService.submit(organizationId, inspectionId).pipe(
            tapResponse({
              next: (inspection: InspectionOutput) => {
                patchState(store,
                  setEntity(inspection, { collection: 'inspection' }),
                  {
                    selectedInspection: inspection,
                    submitOperation: createSuccessOperation(inspection),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  submitOperation: createErrorOperation(operationError, store.submitOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.submitFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to submit inspection'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    close: rxMethod<{ organizationId: string; inspectionId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            closeOperation: createLoadingOperation(store.closeOperation().data),
          });
        }),
        exhaustMap(({ organizationId, inspectionId }) =>
          inspectionService.close(organizationId, inspectionId).pipe(
            tapResponse({
              next: (inspection: InspectionOutput) => {
                patchState(store,
                  setEntity(inspection, { collection: 'inspection' }),
                  {
                    selectedInspection: inspection,
                    closeOperation: createSuccessOperation(inspection),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  closeOperation: createErrorOperation(operationError, store.closeOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.closeFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to close inspection'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Non-Conformities ───────────────────────────────────────────────────

    loadNonConformities: rxMethod<{ organizationId: string; inspectionId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            nonConformitiesListOperation: createLoadingOperation(store.nonConformitiesListOperation().data),
          });
        }),
        switchMap(({ organizationId, inspectionId, options }) =>
          inspectionService.listNonConformities(organizationId, inspectionId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<NonConformityOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'nonConformity' }),
                  {
                    totalNonConformities: response.totalItems,
                    nonConformitiesListOperation: {
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
                  nonConformitiesListOperation: createErrorOperation(operationError, store.nonConformitiesListOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.nonConformitiesListFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load non-conformities'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    addNonConformity: rxMethod<{ organizationId: string; inspectionId: string; input: AddNonConformityInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            addNonConformityOperation: createLoadingOperation(store.addNonConformityOperation().data),
          });
        }),
        exhaustMap(({ organizationId, inspectionId, input }) =>
          inspectionService.addNonConformity(organizationId, inspectionId, input).pipe(
            tapResponse({
              next: (nonConformity: NonConformityOutput) => {
                patchState(store,
                  addEntity(nonConformity, { collection: 'nonConformity' }),
                  {
                    totalNonConformities: store.totalNonConformities() + 1,
                    addNonConformityOperation: createSuccessOperation(nonConformity),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  addNonConformityOperation: createErrorOperation(operationError, store.addNonConformityOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.addNonConformityFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to add non-conformity'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    updateNonConformityStatus: rxMethod<{ organizationId: string; inspectionId: string; nonConformityId: string; input: UpdateNonConformityStatusInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            updateNonConformityStatusOperation: createLoadingOperation(store.updateNonConformityStatusOperation().data),
          });
        }),
        exhaustMap(({ organizationId, inspectionId, nonConformityId, input }) =>
          inspectionService.updateNonConformityStatus(organizationId, inspectionId, nonConformityId, input).pipe(
            tapResponse({
              next: (nonConformity: NonConformityOutput) => {
                patchState(store,
                  setEntity(nonConformity, { collection: 'nonConformity' }),
                  {
                    updateNonConformityStatusOperation: createSuccessOperation(nonConformity),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  updateNonConformityStatusOperation: createErrorOperation(operationError, store.updateNonConformityStatusOperation().data),
                });
                dispatcher.dispatch(
                  inspectionStoreEvents.updateNonConformityStatusFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to update non-conformity status'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Sync Helpers ───────────────────────────────────────────────────────

    clear(): void {
      patchState(store,
        removeAllEntities({ collection: 'inspection' }),
        removeAllEntities({ collection: 'nonConformity' }),
        INITIAL_INSPECTION_STATE,
      );
    },

    resetCreateOperation(): void {
      patchState(store, { createOperation: createIdleOperation() });
    },
  })),
  //#endregion
);

export type InspectionStore = InstanceType<typeof InspectionStore>;
