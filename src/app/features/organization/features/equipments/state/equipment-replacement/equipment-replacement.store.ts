import { computed, DestroyRef, effect, inject, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, finalize, mergeMap, pipe, switchMap } from 'rxjs';
import { getIdempotencyErrorCode } from '@core/api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  WriteOperationService,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
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
    (store, service = inject(EquipmentService), active = inject(ActiveEquipmentStore)) => {
      const session = inject(AUTH_SESSION_PORT);
      const intentions = inject(WriteOperationService).createTracker();
      let observedRevision = session.sessionRevision();
      let pendingRevision: number | null = null;
      let receiptFailure = false;

      /**
       * Function synchronizeSession
       *
       * @description
       * Releases the previous principal's commands without cancelling its accepted server write.
       *
       * @param {number} revision - Current local session identity.
       *
       * @returns {void} Clears private candidates, feedback and retry identities on replacement.
       */
      const synchronizeSession = (revision: number): void => {
        if (revision === observedRevision) return;
        observedRevision = revision;
        intentions.clear();
        pendingRevision = null;
        receiptFailure = false;
        patchState(store, removeAllEntities({ collection: 'candidate' }), {
          candidatesCallState: idleCallState(),
          replaceCallState: idleCallState(),
          command: null,
          commandEquipmentId: null,
          commandOrganizationId: null,
          totalCandidates: 0,
        });
      };
      effect(() => {
        const revision = session.sessionRevision();
        untracked(() => synchronizeSession(revision));
      });
      inject(DestroyRef).onDestroy(() => intentions.clear());

      return {
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
              const revision = session.sessionRevision();
              synchronizeSession(revision);
              patchState(store, { candidatesCallState: pendingCallState(), page, search });
              return service
                .list(organizationId, {
                  itemsPerPage: 50,
                  page,
                  params: { search, status: 'in_stock' },
                })
                .pipe(
                  tapResponse({
                    next: (response) => {
                      if (session.sessionRevision() !== revision) return;
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
                      );
                    },
                    error: (error: unknown) => {
                      if (session.sessionRevision() === revision)
                        patchState(store, {
                          candidatesCallState: errorCallState(toStoreError(error)),
                        });
                    },
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
            mergeMap(({ organizationId, equipmentId, input }) => {
              const revision = session.sessionRevision();
              synchronizeSession(revision);
              if (pendingRevision === revision) return EMPTY;
              pendingRevision = revision;
              const command =
                store.commandEquipmentId() === equipmentId &&
                store.commandOrganizationId() === organizationId
                  ? (store.command() ?? structuredClone(input))
                  : structuredClone(input);
              const options = intentions.options(
                'equipment.replace',
                [organizationId, equipmentId, command],
                revision,
              );
              patchState(store, {
                command,
                commandEquipmentId: equipmentId,
                commandOrganizationId: organizationId,
                replaceCallState: pendingCallState(),
              });
              return service.replace(organizationId, equipmentId, command, options).pipe(
                tapResponse({
                  next: (receipt) => {
                    if (session.sessionRevision() !== revision) return;
                    intentions.complete('equipment.replace');
                    receiptFailure = false;
                    const current = active.selectedEquipment();
                    if (current?.id === receipt.predecessorEquipmentId)
                      active.setEquipment({
                        ...current,
                        status: 'decommissioned',
                        successorEquipmentId: receipt.successorEquipmentId,
                      });
                    patchState(store, {
                      command: null,
                      commandEquipmentId: null,
                      commandOrganizationId: null,
                      replaceCallState: successCallState(receipt),
                    });
                  },
                  error: (error: unknown) => {
                    if (session.sessionRevision() !== revision) return;
                    receiptFailure = getIdempotencyErrorCode(error) !== null;
                    patchState(store, { replaceCallState: errorCallState(toStoreError(error)) });
                  },
                }),
                finalize(() => {
                  if (pendingRevision === revision) pendingRevision = null;
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
          if (
            state.status === 'pending' ||
            receiptFailure ||
            (state.status === 'error' && state.error?.retryable)
          )
            return;
          intentions.complete('equipment.replace');
          patchState(store, {
            command: null,
            commandEquipmentId: null,
            commandOrganizationId: null,
            replaceCallState: idleCallState(),
          });
        },
      };
    },
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
