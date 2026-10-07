import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { entityConfig, setAllEntities, upsertEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap, type Observable } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type {
  CreateEquipmentTypeInput,
  EquipmentTypeOutput,
  UpdateEquipmentTypeInput,
} from '@features/organization/features/equipments/models';
import { equipmentTypeAdministrationEvents } from './events';

/**
 * Type EquipmentTypeCommand
 *
 * @description
 * Accepted catalogue command retains its originating organization and reviewed revision.
 *
 * @type EquipmentTypeCommand
 */
export type EquipmentTypeCommand =
  | {
      readonly kind: 'create';
      readonly organizationId: string;
      readonly input: CreateEquipmentTypeInput;
    }
  | {
      readonly kind: 'update';
      readonly organizationId: string;
      readonly value: string;
      readonly input: UpdateEquipmentTypeInput;
    };

/**
 * Constant TYPE_CONFIG
 *
 * @description
 * Catalogue entries use permanent codes as entity identities.
 */
const TYPE_CONFIG = entityConfig({
  entity: {} as EquipmentTypeOutput,
  collection: 'equipmentType',
  selectId: (entry) => entry.value,
});

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Separate collection and command states distinguish stale reads from rejected edits.
 */
const INITIAL_STATE = {
  organizationId: null as string | null,
  scopeRevision: 0,
  listCallState: idleCallState() as CallState,
  writeCallState: idleCallState() as CallState<EquipmentTypeOutput>,
};

/**
 * Constant EquipmentTypeAdministrationStore
 *
 * @description
 * Page-owned catalogue administration cancels obsolete reads and preserves accepted writes.
 */
export const EquipmentTypeAdministrationStore = signalStore(
  withEntities(TYPE_CONFIG),
  withState(INITIAL_STATE),
  withMethods((store, service = inject(EquipmentTypeService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Loads every entry and clears data immediately when the organization changes.
     *
     * @access public
     * @since unreleased
     *
     * @param {string | null} organizationId - Organization to read, or null to clear.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId) => {
          if (organizationId !== store.organizationId()) {
            const scopeRevision = store.scopeRevision() + 1;
            patchState(
              store,
              INITIAL_STATE,
              { scopeRevision },
              setAllEntities([] as EquipmentTypeOutput[], TYPE_CONFIG),
            );
          }
          if (!organizationId) return EMPTY;
          patchState(store, { organizationId, listCallState: pendingCallState() });
          return service.listAll(organizationId).pipe(
            tapResponse({
              next: (entries) => {
                const reconciled = new Map(entries.map((entry) => [entry.value, entry]));
                for (const current of store.equipmentTypeEntities()) {
                  const incoming = reconciled.get(current.value);
                  if (!incoming || current.revision > incoming.revision)
                    reconciled.set(current.value, current);
                }
                patchState(store, setAllEntities([...reconciled.values()], TYPE_CONFIG), {
                  listCallState: successCallState(null),
                });
              },
              error: (error: unknown) =>
                patchState(store, {
                  listCallState: errorCallState(toStoreError(error)),
                }),
            }),
          );
        }),
      ),
    ),

    /**
     * Method clearWrite
     * @method clearWrite
     *
     * @description
     * Clears a previous rejection only when the operator opens a new editor.
     *
     * @access public
     * @since unreleased
     *
     * @returns {void}
     */
    clearWrite(): void {
      if (store.writeCallState().status !== 'pending')
        patchState(store, { writeCallState: idleCallState() });
    },
  })),
  withMethods((store, service = inject(EquipmentTypeService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Method save
     * @method save
     *
     * @description
     * Executes one accepted command at a time; conflicts retain the reviewed revision and draft.
     *
     * @access public
     * @since unreleased
     *
     * @param {EquipmentTypeCommand} command - Organization and explicit write intent.
     *
     * @returns {void}
     */
    save: rxMethod<EquipmentTypeCommand>(
      pipe(
        exhaustMap((command) => {
          if (command.organizationId !== store.organizationId()) return EMPTY;
          const scopeRevision = store.scopeRevision();
          patchState(store, { writeCallState: pendingCallState() });
          const request: Observable<EquipmentTypeOutput> =
            command.kind === 'create'
              ? service.create(command.organizationId, command.input)
              : service.update(command.organizationId, command.value, command.input);
          return request.pipe(
            tapResponse({
              next: (entry) => {
                if (
                  store.organizationId() === command.organizationId &&
                  store.scopeRevision() === scopeRevision
                ) {
                  patchState(store, upsertEntity(entry, TYPE_CONFIG), {
                    writeCallState: successCallState(entry),
                  });
                  dispatcher.dispatch(
                    equipmentTypeAdministrationEvents.saved({
                      organizationId: command.organizationId,
                      value: entry.value,
                    }),
                  );
                }
              },
              error: (error: unknown) => {
                if (
                  store.organizationId() === command.organizationId &&
                  store.scopeRevision() === scopeRevision
                )
                  patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
              },
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type EquipmentTypeAdministrationStoreType
 *
 * @description
 * Page-scoped injectable catalogue administrator.
 *
 * @type EquipmentTypeAdministrationStoreType
 */
export type EquipmentTypeAdministrationStoreType = InstanceType<
  typeof EquipmentTypeAdministrationStore
>;
