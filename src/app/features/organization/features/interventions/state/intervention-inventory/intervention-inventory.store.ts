import { isPlatformBrowser } from '@angular/common';
import { computed, DOCUMENT, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, defer, EMPTY, from, pipe, switchMap } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionInventoryScope } from '@features/organization/features/interventions/models';
import { InterventionInventoryService } from '@features/organization/features/interventions/services/intervention-inventory';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionIntent,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';
import type { InterventionInventoryState } from './models/intervention-inventory-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * No reference is usable offline until a complete authorized snapshot is durable.
 *
 * @type {InterventionInventoryState}
 */
const INITIAL_STATE: InterventionInventoryState = {
  scope: null,
  snapshot: null,
  readCallState: idleCallState(),
  queueCallState: idleCallState(),
  localIntents: [],
  acceptedOperationId: null,
  unpersistedInput: null,
  fromDevice: false,
};

/**
 * Function sameScope
 *
 * @description
 * Compares captured account, session and workspace identity.
 *
 * @param {InterventionInventoryScope | null} left - Previous captured scope, or none before
 *   activation.
 * @param {InterventionInventoryScope} right - Scope whose account, session and workspace must
 *   match.
 *
 * @returns {boolean} Whether both captures still describe the same authorized context.
 */
function sameScope(
  left: InterventionInventoryScope | null,
  right: InterventionInventoryScope,
): boolean {
  return (
    left?.accountId === right.accountId &&
    left.sessionRevision === right.sessionRevision &&
    left.organizationId === right.organizationId &&
    left.interventionId === right.interventionId
  );
}

/**
 * Constant InterventionInventoryStore
 *
 * @description
 * Intervention-scoped parts declarations: a device receipt clears input only after durable storage.
 * A server receipt can remain received_pending; it is distinct from transport synchronization.
 */
export const InterventionInventoryStore = signalStore(
  withState<InterventionInventoryState>(INITIAL_STATE),
  withEntities<InventoryConsumptionOutput>(),
  withComputed((store) => ({
    /**
     * @description
     * Whether leaving would lose a submitted physical fact.
     */
    hasUnpersistedDeclaration: computed(() => store.unpersistedInput() !== null),
    /**
     * @description
     * Complete history and catalogs are not inferred from an individual receipt.
     */
    catalogReady: computed(() => store.snapshot()?.catalogComplete === true),
    /**
     * @description
     * Canonical server acknowledgments that still require a stock reconciliation.
     */
    unresolvedCount: computed(
      () => store.entities().filter((item) => item.status === 'received_pending').length,
    ),
  })),
  withMethods(
    (
      store,
      inventory = inject(InterventionInventoryService),
      offline = inject(InterventionOfflineService),
    ) => {
      const current = (scope: InterventionInventoryScope): boolean =>
        sameScope(store.scope(), scope) && inventory.isCurrent(scope);
      const readIntents = async (
        scope: InterventionInventoryScope,
      ): Promise<readonly InventoryConsumptionIntent[]> => {
        if (!current(scope)) return [];
        const operations = await offline.listOutbox(scope.interventionId);
        if (!current(scope)) return [];
        return operations.flatMap((operation): readonly InventoryConsumptionIntent[] => {
          if (
            operation.type !== 'inventory-consumption.declare' ||
            operation.payload.actorId !== scope.accountId
          )
            return [];
          const input: DeclareInventoryConsumptionInput = {
            clientOperationId: operation.payload.clientOperationId,
            interventionId: operation.interventionId,
            partId: operation.payload.partId,
            warehouseId: operation.payload.warehouseId,
            quantity: operation.payload.quantity,
            workItemId: operation.payload.workItemId ?? null,
            equipmentId: operation.payload.equipmentId ?? null,
            occurredAt: operation.payload.occurredAt,
          };
          return [
            {
              input,
              status: operation.status === 'pending' ? 'queued' : 'failed',
              error: operation.error,
            },
          ];
        });
      };
      const refreshLocal = rxMethod<InterventionInventoryScope>(
        pipe(
          switchMap((scope) =>
            current(scope)
              ? from(readIntents(scope)).pipe(
                  tapResponse({
                    next: (localIntents) => {
                      if (current(scope)) patchState(store, { localIntents });
                    },
                    error: (error: unknown) => {
                      if (current(scope))
                        patchState(store, { readCallState: errorCallState(toStoreError(error)) });
                    },
                  }),
                )
              : EMPTY,
          ),
        ),
      );
      return {
        /**
         * @description
         * Clears obsolete facts and restores durable local declarations independently of network.
         */
        refreshLocal,
        /**
         * @description
         * Serializes stable operations. Repeating a failed declaration retries the same durable
         * row. Input is acknowledged after the database confirms its transaction, even if a later
         * read fails.
         */
        declare: rxMethod<{
          readonly scope: InterventionInventoryScope;
          readonly input: DeclareInventoryConsumptionInput;
        }>(
          pipe(
            concatMap(({ scope, input }) => {
              if (
                !current(scope) ||
                !inventory.isCurrent(scope, true) ||
                input.interventionId !== scope.interventionId
              )
                return EMPTY;
              const snapshot = store.snapshot();
              if (
                !snapshot?.catalogComplete ||
                !snapshot.parts.some((part) => part.id === input.partId && !part.archived) ||
                !snapshot.warehouses.some(
                  (warehouse) => warehouse.id === input.warehouseId && !warehouse.archived,
                )
              )
                return EMPTY;
              patchState(store, {
                queueCallState: pendingCallState(),
                acceptedOperationId: null,
                unpersistedInput: input,
              });
              return from(
                offline.queueInventoryConsumption(
                  scope.organizationId,
                  input,
                  scope.accountId,
                  () => current(scope) && inventory.isCurrent(scope, true),
                ),
              ).pipe(
                tapResponse({
                  next: () => {
                    if (!current(scope)) return;
                    patchState(store, {
                      queueCallState: successCallState(null),
                      acceptedOperationId: input.clientOperationId,
                      unpersistedInput: null,
                    });
                    refreshLocal(scope);
                  },
                  error: (error: unknown) => {
                    if (current(scope))
                      patchState(store, { queueCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
  withMethods(
    (
      store,
      inventory = inject(InterventionInventoryService),
      connectivity = inject(ConnectivityService),
    ) => ({
      /**
       * @description
       * Reads every authorized server page, retaining a previous complete snapshot if disconnected.
       */
      load: rxMethod<InterventionInventoryScope | null>(
        pipe(
          switchMap((scope) => {
            if (!scope || !inventory.isCurrent(scope)) {
              patchState(store, INITIAL_STATE, removeAllEntities());
              return EMPTY;
            }
            if (!sameScope(store.scope(), scope))
              patchState(store, INITIAL_STATE, removeAllEntities());
            patchState(store, { scope, readCallState: pendingCallState() });
            const current = (): boolean =>
              sameScope(store.scope(), scope) && inventory.isCurrent(scope);
            return defer(async () => {
              const saved = await inventory.loadSaved(scope);
              if (!current()) return null;
              if (saved)
                patchState(
                  store,
                  { snapshot: saved, fromDevice: true },
                  setAllEntities([...saved.declarations]),
                );
              store.refreshLocal(scope);
              if (connectivity.isOffline()) return saved;
              const fresh = await inventory.refresh(scope);
              return current() ? fresh : null;
            }).pipe(
              tapResponse({
                next: (snapshot) => {
                  if (!current()) return;
                  patchState(
                    store,
                    {
                      snapshot,
                      fromDevice: connectivity.isOffline(),
                      readCallState: successCallState(null),
                    },
                    setAllEntities<InventoryConsumptionOutput>([...(snapshot?.declarations ?? [])]),
                  );
                },
                error: (error: unknown) => {
                  if (current())
                    patchState(store, { readCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
  withHooks((store, document = inject(DOCUMENT), platform = inject(PLATFORM_ID)) => ({
    onInit(): void {
      if (!isPlatformBrowser(platform) || !document.defaultView) return;
      const view = document.defaultView;
      effect((onCleanup) => {
        if (!store.hasUnpersistedDeclaration()) return;
        const beforeUnload = (event: BeforeUnloadEvent): void => {
          if (store.hasUnpersistedDeclaration()) event.preventDefault();
        };
        view.addEventListener('beforeunload', beforeUnload);
        onCleanup(() => view.removeEventListener('beforeunload', beforeUnload));
      });
    },
  })),
);

/**
 * Type InterventionInventoryStoreType
 *
 * @description
 * Component-scoped device and server stock state.
 *
 * @type {InstanceType<typeof InterventionInventoryStore>}
 */
export type InterventionInventoryStoreType = InstanceType<typeof InterventionInventoryStore>;
