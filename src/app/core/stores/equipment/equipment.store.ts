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
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { EquipmentService } from '@core/services/api/equipment';
import type { RequestOptions } from '@core/services/api';
import type { HydraCollection } from '@core/models/api';
import type {
  EquipmentOutput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  AssignToFacilityInput,
  EquipmentAttachmentOutput,
  AddAttachmentInput,
  EquipmentTagOutput,
  AddTagInput,
} from '@core/models/equipment';
import type { EquipmentState } from './equipment-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import { equipmentStoreEvents } from './equipment.events';

//#region Initial State
const INITIAL_EQUIPMENT_STATE: EquipmentState = {
  totalEquipment: 0,
  selectedEquipment: null,
  listOperation: createIdleOperation(),
  getOperation: createIdleOperation(),
  createOperation: createIdleOperation(),
  updateOperation: createIdleOperation(),
  assignToFacilityOperation: createIdleOperation(),
  unassignFromFacilityOperation: createIdleOperation(),
  commissionOperation: createIdleOperation(),
  decommissionOperation: createIdleOperation(),
  maintenanceOperation: createIdleOperation(),
  totalAttachments: 0,
  attachmentsListOperation: createIdleOperation(),
  addAttachmentOperation: createIdleOperation(),
  deleteAttachmentOperation: createIdleOperation(),
  totalTags: 0,
  tagsListOperation: createIdleOperation(),
  addTagOperation: createIdleOperation(),
  removeTagOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store EquipmentStore
 * @const EquipmentStore
 *
 * @description
 * NGRX SignalStore for equipment management.
 * Handles equipment CRUD, lifecycle transitions, attachments and tags.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const EquipmentStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<EquipmentState>(INITIAL_EQUIPMENT_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<EquipmentOutput>(), collection: 'equipment' }),
  withEntities({ entity: type<EquipmentAttachmentOutput>(), collection: 'attachment' }),
  withEntities({ entity: type<EquipmentTagOutput>(), collection: 'tag' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    equipmentList: computed<ReadonlyArray<EquipmentOutput>>(
      () => store.equipmentEntities(),
    ),
    attachments: computed<ReadonlyArray<EquipmentAttachmentOutput>>(
      () => store.attachmentEntities(),
    ),
    tags: computed<ReadonlyArray<EquipmentTagOutput>>(
      () => store.tagEntities(),
    ),
    isLoadingEquipment: computed<boolean>(
      () => store.listOperation().status === 'loading',
    ),
    isLoadingEquipmentDetail: computed<boolean>(
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
    equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService),
  ) => ({
    // ── Equipment CRUD ─────────────────────────────────────────────────────

    loadEquipment: rxMethod<{ organizationId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap(({ organizationId, options }) =>
          equipmentService.list(organizationId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<EquipmentOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'equipment' }),
                  {
                    totalEquipment: response.totalItems,
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
                  equipmentStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load equipment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    loadEquipmentDetail: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            getOperation: createLoadingOperation(store.getOperation().data),
          });
        }),
        switchMap(({ organizationId, equipmentId }) =>
          equipmentService.get(organizationId, equipmentId).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store, {
                  selectedEquipment: equipment,
                  getOperation: createSuccessOperation(equipment),
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  getOperation: createErrorOperation(operationError, store.getOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.getFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load equipment detail'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    create: rxMethod<{ organizationId: string; input: CreateEquipmentInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap(({ organizationId, input }) =>
          equipmentService.create(organizationId, input).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  addEntity(equipment, { collection: 'equipment' }),
                  {
                    totalEquipment: store.totalEquipment() + 1,
                    createOperation: createSuccessOperation(equipment),
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
                  equipmentStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create equipment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    update: rxMethod<{ organizationId: string; equipmentId: string; input: UpdateEquipmentInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            updateOperation: createLoadingOperation(store.updateOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, input }) =>
          equipmentService.update(organizationId, equipmentId, input).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    updateOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  updateOperation: createErrorOperation(operationError, store.updateOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.updateFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to update equipment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Lifecycle ──────────────────────────────────────────────────────────

    assignToFacility: rxMethod<{ organizationId: string; equipmentId: string; input: AssignToFacilityInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            assignToFacilityOperation: createLoadingOperation(store.assignToFacilityOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, input }) =>
          equipmentService.assignToFacility(organizationId, equipmentId, input).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    assignToFacilityOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  assignToFacilityOperation: createErrorOperation(operationError, store.assignToFacilityOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.assignToFacilityFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to assign equipment to facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    unassignFromFacility: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            unassignFromFacilityOperation: createLoadingOperation(store.unassignFromFacilityOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId }) =>
          equipmentService.unassignFromFacility(organizationId, equipmentId).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    unassignFromFacilityOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  unassignFromFacilityOperation: createErrorOperation(operationError, store.unassignFromFacilityOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.unassignFromFacilityFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to unassign equipment from facility'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    commission: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            commissionOperation: createLoadingOperation(store.commissionOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId }) =>
          equipmentService.commission(organizationId, equipmentId).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    commissionOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  commissionOperation: createErrorOperation(operationError, store.commissionOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.commissionFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to commission equipment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    decommission: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            decommissionOperation: createLoadingOperation(store.decommissionOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId }) =>
          equipmentService.decommission(organizationId, equipmentId).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    decommissionOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  decommissionOperation: createErrorOperation(operationError, store.decommissionOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.decommissionFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to decommission equipment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    maintenance: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            maintenanceOperation: createLoadingOperation(store.maintenanceOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId }) =>
          equipmentService.maintenance(organizationId, equipmentId).pipe(
            tapResponse({
              next: (equipment: EquipmentOutput) => {
                patchState(store,
                  setEntity(equipment, { collection: 'equipment' }),
                  {
                    selectedEquipment: equipment,
                    maintenanceOperation: createSuccessOperation(equipment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  maintenanceOperation: createErrorOperation(operationError, store.maintenanceOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.maintenanceFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to set equipment to maintenance'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Attachments ────────────────────────────────────────────────────────

    loadAttachments: rxMethod<{ organizationId: string; equipmentId: string; options?: RequestOptions }>(
      pipe(
        tap(() => {
          patchState(store, {
            attachmentsListOperation: createLoadingOperation(store.attachmentsListOperation().data),
          });
        }),
        switchMap(({ organizationId, equipmentId, options }) =>
          equipmentService.listAttachments(organizationId, equipmentId, options).pipe(
            tapResponse({
              next: (response: HydraCollection<EquipmentAttachmentOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'attachment' }),
                  {
                    totalAttachments: response.totalItems,
                    attachmentsListOperation: {
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
                  attachmentsListOperation: createErrorOperation(operationError, store.attachmentsListOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.attachmentsListFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load attachments'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    addAttachment: rxMethod<{ organizationId: string; equipmentId: string; input: AddAttachmentInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            addAttachmentOperation: createLoadingOperation(store.addAttachmentOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, input }) =>
          equipmentService.addAttachment(organizationId, equipmentId, input).pipe(
            tapResponse({
              next: (attachment: EquipmentAttachmentOutput) => {
                patchState(store,
                  addEntity(attachment, { collection: 'attachment' }),
                  {
                    totalAttachments: store.totalAttachments() + 1,
                    addAttachmentOperation: createSuccessOperation(attachment),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  addAttachmentOperation: createErrorOperation(operationError, store.addAttachmentOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.addAttachmentFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to add attachment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    deleteAttachment: rxMethod<{ organizationId: string; equipmentId: string; attachmentId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            deleteAttachmentOperation: createLoadingOperation(store.deleteAttachmentOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, attachmentId }) =>
          equipmentService.deleteAttachment(organizationId, equipmentId, attachmentId).pipe(
            tapResponse({
              next: () => {
                patchState(store,
                  removeEntity(attachmentId, { collection: 'attachment' }),
                  {
                    totalAttachments: Math.max(0, store.totalAttachments() - 1),
                    deleteAttachmentOperation: createSuccessOperation(null),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  deleteAttachmentOperation: createErrorOperation(operationError, store.deleteAttachmentOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.deleteAttachmentFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to delete attachment'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    // ── Tags ───────────────────────────────────────────────────────────────

    addTag: rxMethod<{ organizationId: string; equipmentId: string; input: AddTagInput }>(
      pipe(
        tap(() => {
          patchState(store, {
            addTagOperation: createLoadingOperation(store.addTagOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, input }) =>
          equipmentService.addTag(organizationId, equipmentId, input).pipe(
            tapResponse({
              next: (tag: EquipmentTagOutput) => {
                patchState(store,
                  addEntity(tag, { collection: 'tag' }),
                  {
                    totalTags: store.totalTags() + 1,
                    addTagOperation: createSuccessOperation(tag),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  addTagOperation: createErrorOperation(operationError, store.addTagOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.addTagFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to add tag'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    removeTag: rxMethod<{ organizationId: string; equipmentId: string; tagId: string }>(
      pipe(
        tap(() => {
          patchState(store, {
            removeTagOperation: createLoadingOperation(store.removeTagOperation().data),
          });
        }),
        exhaustMap(({ organizationId, equipmentId, tagId }) =>
          equipmentService.removeTag(organizationId, equipmentId, tagId).pipe(
            tapResponse({
              next: () => {
                patchState(store,
                  removeEntity(tagId, { collection: 'tag' }),
                  {
                    totalTags: Math.max(0, store.totalTags() - 1),
                    removeTagOperation: createSuccessOperation(null),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  removeTagOperation: createErrorOperation(operationError, store.removeTagOperation().data),
                });
                dispatcher.dispatch(
                  equipmentStoreEvents.removeTagFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to remove tag'),
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
        removeAllEntities({ collection: 'equipment' }),
        removeAllEntities({ collection: 'attachment' }),
        removeAllEntities({ collection: 'tag' }),
        INITIAL_EQUIPMENT_STATE,
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

export type EquipmentStore = InstanceType<typeof EquipmentStore>;
