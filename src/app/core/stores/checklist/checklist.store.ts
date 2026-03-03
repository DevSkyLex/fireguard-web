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
import { ChecklistService } from '@core/services/api/checklist';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  ChecklistOutput,
  CreateChecklistInput,
} from '@core/models/checklist';
import type { ChecklistState } from './checklist-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import { checklistStoreEvents } from './checklist.events';

//#region Initial State
const INITIAL_CHECKLIST_STATE: ChecklistState = {
  totalChecklists: 0,
  selectedChecklist: null,
  listOperation: createIdleOperation(),
  getOperation: createIdleOperation(),
  createOperation: createIdleOperation(),
  archiveOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store ChecklistStore
 * @const ChecklistStore
 *
 * @description
 * NGRX SignalStore for checklist management.
 * Handles checklist CRUD and archiving.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ChecklistStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<ChecklistState>(INITIAL_CHECKLIST_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<ChecklistOutput>(), collection: 'checklist' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    checklists: computed<ReadonlyArray<ChecklistOutput>>(
      () => store.checklistEntities(),
    ),
    isLoadingChecklists: computed<boolean>(
      () => store.listOperation().status === 'loading',
    ),
    isLoadingChecklist: computed<boolean>(
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
    checklistService: ChecklistService = inject<ChecklistService>(ChecklistService),
  ) => ({
    loadChecklists: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          checklistService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<ChecklistOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'checklist' }),
                  {
                    totalChecklists: response.totalItems,
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
                  checklistStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load checklists'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    loadChecklist: rxMethod<{ organizationId: string; checklistId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            getOperation: createLoadingOperation(store.getOperation().data),
          });
        }),
        switchMap(({ organizationId, checklistId }) =>
          checklistService.get(organizationId, checklistId).pipe(
            tapResponse({
              next: (checklist: ChecklistOutput) => {
                patchState(store, {
                  selectedChecklist: checklist,
                  getOperation: createSuccessOperation(checklist),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  getOperation: createErrorOperation(operationError, store.getOperation().data),
                });
                dispatcher.dispatch(
                  checklistStoreEvents.getFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load checklist'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    create: rxMethod<{ organizationId: string; input: CreateChecklistInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          checklistService.create(organizationId, input).pipe(
            tapResponse({
              next: (checklist: ChecklistOutput) => {
                patchState(store,
                  addEntity(checklist, { collection: 'checklist' }),
                  {
                    totalChecklists: store.totalChecklists() + 1,
                    createOperation: createSuccessOperation(checklist),
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
                  checklistStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create checklist'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    archive: rxMethod<{ organizationId: string; checklistId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            archiveOperation: createLoadingOperation(store.archiveOperation().data),
          });
        }),
        exhaustMap(({ organizationId, checklistId }) =>
          checklistService.archive(organizationId, checklistId).pipe(
            tapResponse({
              next: (checklist: ChecklistOutput) => {
                patchState(store,
                  setEntity(checklist, { collection: 'checklist' }),
                  {
                    archiveOperation: createSuccessOperation(checklist),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  archiveOperation: createErrorOperation(operationError, store.archiveOperation().data),
                });
                dispatcher.dispatch(
                  checklistStoreEvents.archiveFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to archive checklist'),
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
        removeAllEntities({ collection: 'checklist' }),
        INITIAL_CHECKLIST_STATE,
      );
    },

    resetCreateOperation(): void {
      patchState(store, { createOperation: createIdleOperation() });
    },
  })),
  //#endregion
);

export type ChecklistStore = InstanceType<typeof ChecklistStore>;
