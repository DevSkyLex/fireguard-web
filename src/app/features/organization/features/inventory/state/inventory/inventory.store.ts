import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  entityConfig,
  setAllEntities,
  upsertEntity,
  removeEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  catchError,
  defer,
  exhaustMap,
  from,
  map,
  mergeMap,
  of,
  pipe,
  switchMap,
  tap,
  toArray,
  type Observable,
} from 'rxjs';
import type { RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import {
  InventoryService,
  InventoryCommandRepository,
} from '@features/organization/features/inventory/data-access';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
  InventoryBalanceOutput,
  InventoryConsumptionOutput,
  InventoryMovementOutput,
  InventoryPhysicalCommand,
} from '@features/organization/features/inventory/models';
import { quantityOnlyInventoryRecord } from '@features/organization/features/inventory/utils';
import { inventoryEvents } from './events';
import type { InventoryCommand } from './inventory-command.type';
import type { InventoryQuery } from './inventory-query.interface';

/**
 * Type InventoryRecord
 *
 * @description
 * Canonical records share stable server identities, with no financial projection.
 *
 * @type InventoryRecord
 */
export type InventoryRecord =
  | InventoryPartOutput
  | InventoryWarehouseOutput
  | InventoryBalanceOutput
  | InventoryConsumptionOutput
  | InventoryMovementOutput;

/**
 * Constant RECORDS
 *
 * @description
 * Current server page uses normalized entities.
 */
const RECORDS = entityConfig({
  entity: {} as InventoryRecord,
  collection: 'record',
  selectId: (record) => record.id,
});
/**
 * Constant PENDING
 *
 * @description
 * Unacknowledged physical commands retain their immutable operation identity.
 */
const PENDING = entityConfig({
  entity: {} as InventoryPhysicalCommand,
  collection: 'pendingCommand',
  selectId: (command) => command.input.clientOperationId,
});
/**
 * Constant INITIAL
 *
 * @description
 * Loading, storage and write states have independent explicit failure modes.
 */
const INITIAL = {
  query: null as InventoryQuery | null,
  scopeRevision: 0,
  listCallState: idleCallState() as CallState,
  writeCallState: idleCallState() as CallState<InventoryRecord>,
  journalCallState: idleCallState() as CallState,
  total: 0,
  partLabels: {} as Record<string, string>,
  partUnits: {} as Record<string, string>,
  warehouseLabels: {} as Record<string, string>,
};

/**
 * Constant InventoryStore
 *
 * @description
 * Server-paginated quantity directories with session-fenced writes and explicit durable replay.
 */
export const InventoryStore = signalStore(
  withEntities(RECORDS),
  withEntities(PENDING),
  withState(INITIAL),
  withComputed((store) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 20))),
  })),
  withMethods((store, service = inject(InventoryService)) => ({
    /**
     * Method load
     *
     * @description
     * Cancels obsolete reads; bounded reference hydration keeps stock facts recognizable.
     *
     * @param {InventoryQuery | null} query - Authorized scope and server filters.
     */
    load: rxMethod<InventoryQuery | null>(
      pipe(
        switchMap((query) => {
          const old = store.query();
          const changed =
            !query || old?.organizationId !== query.organizationId || old?.userId !== query.userId;
          if (changed)
            patchState(
              store,
              INITIAL,
              { scopeRevision: store.scopeRevision() + 1 },
              setAllEntities([] as InventoryRecord[], RECORDS),
              setAllEntities([] as InventoryPhysicalCommand[], PENDING),
            );
          if (!query) return EMPTY;
          patchState(
            store,
            { query, listCallState: pendingCallState() },
            setAllEntities([] as InventoryRecord[], RECORDS),
          );
          const options: RequestOptions = {
            page: query.page ?? 1,
            itemsPerPage: 20,
            search:
              query.section === 'parts' || query.section === 'warehouses'
                ? query.search
                : undefined,
            params: {
              ...(query.section === 'parts' || query.section === 'warehouses'
                ? { archived: query.archived ?? false }
                : {}),
              ...(query.partId ? { partId: query.partId } : {}),
              ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
              ...(query.section === 'consumptions' && query.status ? { status: query.status } : {}),
            },
          };
          const request: Observable<HydraCollection<InventoryRecord>> =
            query.section === 'parts'
              ? service.listParts(query.organizationId, options)
              : query.section === 'warehouses'
                ? service.listWarehouses(query.organizationId, options)
                : query.section === 'balances'
                  ? service.listBalances(query.organizationId, options)
                  : query.section === 'consumptions'
                    ? service.listConsumptions(query.organizationId, options)
                    : service.listMovements(query.organizationId, options);
          return request.pipe(
            switchMap((response) => {
              const missing = new Map<string, { kind: 'part' | 'warehouse'; id: string }>();
              for (const entry of response.member) {
                if ('partId' in entry && !store.partLabels()[entry.partId])
                  missing.set('part:' + entry.partId, { kind: 'part', id: entry.partId });
                if ('warehouseId' in entry && !store.warehouseLabels()[entry.warehouseId])
                  missing.set('warehouse:' + entry.warehouseId, {
                    kind: 'warehouse',
                    id: entry.warehouseId,
                  });
              }
              return from(missing.values()).pipe(
                mergeMap((ref) => {
                  const read: Observable<InventoryPartOutput | InventoryWarehouseOutput> =
                    ref.kind === 'part'
                      ? service.readPart(query.organizationId, ref.id)
                      : service.readWarehouse(query.organizationId, ref.id);
                  return read.pipe(
                    map((entry) => ({ ref, entry })),
                    catchError(() => of(null)),
                  );
                }, 4),
                toArray(),
                map((labels) => ({ response, labels })),
              );
            }),
            tapResponse({
              next: ({ response, labels }) => {
                const partLabels = { ...store.partLabels() },
                  partUnits = { ...store.partUnits() },
                  warehouseLabels = { ...store.warehouseLabels() };
                for (const result of labels) {
                  if (!result) continue;
                  const { ref, entry } = result;
                  if ('label' in entry) {
                    partLabels[ref.id] = entry.label;
                    partUnits[ref.id] = entry.unit;
                  } else warehouseLabels[ref.id] = entry.name;
                }
                patchState(
                  store,
                  setAllEntities(response.member.map(quantityOnlyInventoryRecord), RECORDS),
                  {
                    total: response.totalItems,
                    partLabels,
                    partUnits,
                    warehouseLabels,
                    listCallState: successCallState(null),
                  },
                );
              },
              error: (error: unknown) =>
                patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    ),
    /**
     * Method clearWrite
     *
     * @description
     * Clears feedback when opening a new editor without cancelling an accepted command.
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
  withMethods((store, journal = inject(InventoryCommandRepository)) => ({
    /**
     * Method loadJournal
     *
     * @description
     * Reads durable unacknowledged commands for explicit operator replay.
     *
     * @param {{ userId: string; organizationId: string } | null} scope - Current account and
     *   organization.
     */
    loadJournal: rxMethod<{ userId: string; organizationId: string } | null>(
      pipe(
        switchMap((scope) => {
          patchState(store, setAllEntities([] as InventoryPhysicalCommand[], PENDING), {
            journalCallState: scope ? pendingCallState() : idleCallState(),
          });
          if (!scope) return EMPTY;
          return from(journal.readPending(scope.userId, scope.organizationId)).pipe(
            tapResponse({
              next: (commands) =>
                patchState(store, setAllEntities([...commands], PENDING), {
                  journalCallState: successCallState(null),
                }),
              error: (error: unknown) =>
                patchState(store, { journalCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    ),
  })),
  withMethods(
    (
      store,
      service = inject(InventoryService),
      journal = inject(InventoryCommandRepository),
      dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method save
       *
       * @description
       * Serializes accepted writes, stores physical intentions first and suppresses
       * obsolete-session effects.
       *
       * @param {InventoryCommand} command - Explicit scoped command.
       */
      save: rxMethod<InventoryCommand>(
        pipe(
          exhaustMap((command) => {
            const scope = store.query();
            if (scope?.organizationId !== command.organizationId || scope.userId !== command.userId)
              return EMPTY;
            const revision = store.scopeRevision();
            const sessionRevision = journal.sessionRevision();
            const current = () =>
              store.scopeRevision() === revision &&
              store.query()?.organizationId === command.organizationId &&
              store.query()?.userId === command.userId &&
              journal.isCurrent(command.userId, command.organizationId, sessionRevision);
            if (!current()) return EMPTY;
            patchState(store, { writeCallState: pendingCallState() });
            const physical =
              command.kind === 'correction' || command.kind === 'return' ? command : null;
            const request = (): Observable<InventoryRecord> => {
              switch (command.kind) {
                case 'createPart':
                  return service.createPart(command.organizationId, command.input);
                case 'createWarehouse':
                  return service.createWarehouse(command.organizationId, command.input);
                case 'updatePart':
                  return service.updatePart(command.organizationId, command.id, command.input);
                case 'updateWarehouse':
                  return service.updateWarehouse(command.organizationId, command.id, command.input);
                case 'reconcile':
                  return service.reconcileConsumption(command.organizationId, command.id);
                case 'return':
                  return service.returnConsumption(command.organizationId, command.input);
                case 'correction':
                  return service.correctStock(command.organizationId, command.input);
              }
            };
            return defer(() => (physical ? from(journal.retain(physical)) : of(undefined))).pipe(
              tap(() => {
                if (physical && current()) patchState(store, upsertEntity(physical, PENDING));
              }),
              switchMap(() => (current() ? request() : EMPTY)),
              switchMap((result) =>
                physical && current()
                  ? from(journal.acknowledge(physical, sessionRevision)).pipe(map(() => result))
                  : of(result),
              ),
              tapResponse({
                next: (result) => {
                  if (!current()) return;
                  patchState(
                    store,
                    ...(physical ? [removeEntity(physical.input.clientOperationId, PENDING)] : []),
                    { writeCallState: successCallState(quantityOnlyInventoryRecord(result)) },
                  );
                  dispatcher.dispatch(
                    inventoryEvents.saved({
                      organizationId: command.organizationId,
                      userId: command.userId,
                      kind: command.kind,
                    }),
                  );
                },
                error: (error: unknown) => {
                  if (current())
                    patchState(store, { writeCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type InventoryStoreType
 *
 * @description
 * Injectable page-owned stock state.
 *
 * @type InventoryStoreType
 */
export type InventoryStoreType = InstanceType<typeof InventoryStore>;
