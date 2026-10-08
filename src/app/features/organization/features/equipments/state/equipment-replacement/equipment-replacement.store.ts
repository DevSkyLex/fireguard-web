import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  ReplaceEquipmentInput,
} from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../active-equipment';
import type { EquipmentReplacementState } from './models/equipment-replacement-state.interface';

/**
 * Constant EquipmentReplacementStore
 *
 * @description
 * Executes atomic replacements and reuses an uncertain command verbatim when retried.
 */
export const EquipmentReplacementStore = signalStore(
  withEntities({ entity: type<EquipmentOutput>(), collection: 'candidate' }),
  withState<EquipmentReplacementState>({
    candidatesCallState: idleCallState(),
    replaceCallState: idleCallState(),
    command: null,
    commandEquipmentId: null,
    commandOrganizationId: null,
    totalCandidates: 0,
    page: 1,
    search: '',
  }),
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.totalCandidates() / 50))),
  })),
  withMethods(
    (store, service = inject(EquipmentService), active = inject(ActiveEquipmentStore)) => ({
      /**
       * Method loadCandidates
       *
       * @description
       * Reads one server page of reserve equipment suitable for replacement.
       */
      loadCandidates: rxMethod<{
        organizationId: string;
        equipmentId: string;
        page?: number;
        search?: string;
      }>(
        pipe(
          switchMap(({ organizationId, equipmentId, page = 1, search = '' }) => {
            patchState(store, { candidatesCallState: pendingCallState(), page, search });
            return service
              .list(organizationId, {
                itemsPerPage: 50,
                page,
                params: { search, status: 'in_stock' },
              })
              .pipe(
                tapResponse({
                  next: (response) =>
                    patchState(
                      store,
                      setAllEntities(
                        response.member.filter(
                          (entry) =>
                            entry.id !== equipmentId &&
                            !entry.predecessorEquipmentId &&
                            !entry.successorEquipmentId,
                        ),
                        { collection: 'candidate' },
                      ),
                      {
                        totalCandidates: response.totalItems,
                        candidatesCallState: successCallState(null),
                      },
                    ),
                  error: (error: unknown) =>
                    patchState(store, { candidatesCallState: errorCallState(toStoreError(error)) }),
                }),
              );
          }),
        ),
      ),
      /**
       * Method replace
       *
       * @description
       * Submits a new operation, or replays the exact command retained after failure.
       */
      replace: rxMethod<{
        organizationId: string;
        equipmentId: string;
        input: ReplaceEquipmentInput;
      }>(
        pipe(
          exhaustMap(({ organizationId, equipmentId, input }) => {
            const command =
              store.commandEquipmentId() === equipmentId &&
              store.commandOrganizationId() === organizationId
                ? (store.command() ?? input)
                : input;
            patchState(store, {
              command,
              commandEquipmentId: equipmentId,
              commandOrganizationId: organizationId,
              replaceCallState: pendingCallState(),
            });
            return service.replace(organizationId, equipmentId, command).pipe(
              tapResponse({
                next: (receipt) => {
                  const current = active.selectedEquipment();
                  if (current?.id === receipt.predecessorEquipmentId)
                    active.setEquipment({
                      ...current,
                      status: 'decommissioned',
                      successorEquipmentId: receipt.successorEquipmentId,
                    });
                  patchState(store, { replaceCallState: successCallState(receipt) });
                },
                error: (error: unknown) =>
                  patchState(store, { replaceCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      /**
       * Method reset
       *
       * @description
       * Clears a definitively rejected command, never an uncertain network result.
       */
      reset(): void {
        const state = store.replaceCallState();
        if (state.status === 'pending' || (state.status === 'error' && state.error?.retryable))
          return;
        patchState(store, { command: null, replaceCallState: idleCallState() });
      },
    }),
  ),
);

/**
 * Type EquipmentReplacementStoreType
 *
 * @description
 * Instance type for page orchestration.
 *
 * @type {EquipmentReplacementStoreType}
 */
export type EquipmentReplacementStoreType = InstanceType<typeof EquipmentReplacementStore>;
