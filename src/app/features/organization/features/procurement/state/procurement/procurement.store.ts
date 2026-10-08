import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap, type Observable } from 'rxjs';
import type { RequestOptions } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { ProcurementService } from '@features/organization/features/procurement/data-access';
import type {
  SupplierOutput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
} from '@features/organization/features/procurement/models';
import { procurementStoreEvents } from './events/events';
import type {
  ProcurementCommand,
  ProcurementMutationOutput,
} from './models/procurement-command.type';
import type { ProcurementState } from './models/procurement-state.interface';
import { creationPayloadKey } from './utils/creation-payload-key/creation-payload-key.utils';

/**
 * Constant ProcurementStore
 *
 * @description
 * Server-paginated organization workspace with one serialized write pipeline. Reads cancel when
 * superseded; uncertain writes retain their original revision and operation UUID for exact replay.
 *
 * @since unreleased
 */
export const ProcurementStore = signalStore(
  withEntities({ entity: type<SupplierOutput>(), collection: 'supplier' }),
  withEntities({ entity: type<PurchaseOrderOutput>(), collection: 'order' }),
  withEntities({ entity: type<ProcurementReceiptOutput>(), collection: 'receipt' }),
  withEntities({ entity: type<ProcurementReturnOutput>(), collection: 'supplyReturn' }),
  withState<ProcurementState>((): ProcurementState => ({
    organizationId: null,
    scopeVersion: 0,
    suppliersCallState: idleCallState(),
    supplierCallState: idleCallState<SupplierOutput>(),
    totalSuppliers: 0,
    ordersCallState: idleCallState(),
    totalOrders: 0,
    orderCallState: idleCallState<PurchaseOrderOutput>(),
    receiptCallState: idleCallState<ProcurementReceiptOutput>(),
    returnCallState: idleCallState<ProcurementReturnOutput>(),
    receiptsCallState: idleCallState(),
    totalReceipts: 0,
    receiptOrderId: null,
    returnsCallState: idleCallState(),
    totalReturns: 0,
    returnReceiptId: null,
    commandCallState: idleCallState<ProcurementMutationOutput>(),
    command: null,
  })),
  withComputed((store) => ({
    /**
     * @description
     * An accepted write locks all conflicting workspace mutations.
     */
    commandPending: computed(() => store.commandCallState().status === 'pending'),
    /**
     * @description
     * A transport-uncertain physical command cannot be replaced by an edited payload.
     */
    uncertainCommand: computed(() => {
      const state = store.commandCallState();
      return (
        state.status === 'error' &&
        !!store.command() &&
        (state.error?.retryable === true || state.error?.code === 0)
      );
    }),
    /**
     * @description
     * Current server source order; quantities and lifecycle remain authoritative.
     */
    selectedOrder: computed(() => store.orderCallState().data),
  })),
  withMethods((store, service = inject(ProcurementService), dispatcher = inject(Dispatcher)) => {
    /**
     * Constant request
     *
     * @description
     * Sends one command through the owning transport without interpreting domain transitions.
     */
    const request = (command: ProcurementCommand): Observable<ProcurementMutationOutput> => {
      const org = command.organizationId;
      switch (command.kind) {
        case 'create_supplier':
          return service.createSupplier(org, command.input);
        case 'update_supplier':
          return service.updateSupplier(org, command.supplier, command.input);
        case 'archive_supplier':
          return service.archiveSupplier(org, command.supplier);
        case 'create_order':
          return service.createOrder(org, command.input);
        case 'update_order':
          return service.updateOrder(org, command.order, command.input);
        case 'place_order':
          return service.placeOrder(org, command.order);
        case 'cancel_remaining':
          return service.cancelRemaining(org, command.order);
        case 'receive':
          return service.receiveOrder(org, command.order, command.input);
        case 'individualize':
          return service.individualizeReceipt(org, command.receipt, command.input);
        case 'return':
          return service.returnReceipt(org, command.receipt, command.input);
        case 'reconcile':
          return service.reconcileReturn(org, command.returned, command.input);
      }
    };
    /**
     * Constant prepareCreation
     *
     * @description
     * Snapshots each new creation under a fresh operation UUID and retains failed identical drafts.
     */
    const prepareCreation = (proposed: ProcurementCommand): ProcurementCommand => {
      if (proposed.kind !== 'create_supplier' && proposed.kind !== 'create_order') return proposed;
      const retained = store.command();
      if (
        store.commandCallState().status === 'error' &&
        retained?.kind === proposed.kind &&
        retained.organizationId === proposed.organizationId &&
        creationPayloadKey(retained.input) === creationPayloadKey(proposed.input)
      )
        return retained;
      const clientOperationId = globalThis.crypto.randomUUID();
      return proposed.kind === 'create_supplier'
        ? { ...proposed, input: { ...structuredClone(proposed.input), clientOperationId } }
        : { ...proposed, input: { ...structuredClone(proposed.input), clientOperationId } };
    };
    return {
      /**
       * Method setScope
       * @method setScope
       *
       * @description
       * Changes the display scope and discards only its old query projections.
       *
       * @access public
       * @since unreleased
       *
       * @param {string} organizationId - Owning organization authority for the request.
       *
       * @returns {void} No return value; emits or updates the local draft only.
       */
      setScope(organizationId: string): void {
        if (store.organizationId() === organizationId) return;
        patchState(
          store,
          removeAllEntities({ collection: 'supplier' }),
          removeAllEntities({ collection: 'order' }),
          removeAllEntities({ collection: 'receipt' }),
          removeAllEntities({ collection: 'supplyReturn' }),
          {
            organizationId,
            scopeVersion: store.scopeVersion() + 1,
            suppliersCallState: idleCallState(),
            supplierCallState: idleCallState(),
            ordersCallState: idleCallState(),
            orderCallState: idleCallState(),
            receiptCallState: idleCallState(),
            returnCallState: idleCallState(),
            receiptsCallState: idleCallState(),
            totalSuppliers: 0,
            totalOrders: 0,
            totalReceipts: 0,
            receiptOrderId: null,
            returnsCallState: idleCallState(),
            totalReturns: 0,
            returnReceiptId: null,
          },
        );
      },
      /**
       * @description
       * Reads a supplier page; old scope results never populate the current organization.
       */
      loadSuppliers: rxMethod<{ organizationId: string; options?: RequestOptions }>(
        pipe(
          switchMap(({ organizationId, options }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { suppliersCallState: pendingCallState() });
            return service.listSuppliers(organizationId, options).pipe(
              tapResponse({
                next: (response) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'supplier' }),
                      {
                        totalSuppliers: response.totalItems,
                        suppliersCallState: successCallState(null),
                      },
                    );
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { suppliersCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Reads the selected retained supplier label independently from current active choices.
       */
      readSupplier: rxMethod<{ organizationId: string; supplierId: string }>(
        pipe(
          switchMap(({ organizationId, supplierId }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { supplierCallState: pendingCallState() });
            return service.readSupplier(organizationId, supplierId).pipe(
              tapResponse({
                next: (supplier) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { supplierCallState: successCallState(supplier) });
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { supplierCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Reads a server-filtered order page without deriving global totals in the browser.
       */
      loadOrders: rxMethod<{ organizationId: string; options?: RequestOptions }>(
        pipe(
          switchMap(({ organizationId, options }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { ordersCallState: pendingCallState() });
            return service.listOrders(organizationId, options).pipe(
              tapResponse({
                next: (response) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'order' }),
                      {
                        totalOrders: response.totalItems,
                        ordersCallState: successCallState(null),
                      },
                    );
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { ordersCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Reads a selected source order independently from the current collection page.
       */
      readOrder: rxMethod<{ organizationId: string; orderId: string }>(
        pipe(
          switchMap(({ organizationId, orderId }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { orderCallState: pendingCallState(store.selectedOrder()) });
            return service.readOrder(organizationId, orderId).pipe(
              tapResponse({
                next: (order) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { orderCallState: successCallState(order) });
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, {
                      orderCallState: errorCallState(toStoreError(error), store.selectedOrder()),
                    });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Reads retained physical receipts for one selected source order.
       */
      loadReceipts: rxMethod<{ organizationId: string; orderId: string; options?: RequestOptions }>(
        pipe(
          switchMap(({ organizationId, orderId, options }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            if (store.receiptOrderId() !== orderId)
              patchState(store, removeAllEntities({ collection: 'receipt' }));
            patchState(store, { receiptOrderId: orderId, receiptsCallState: pendingCallState() });
            return service.listReceipts(organizationId, orderId, options).pipe(
              tapResponse({
                next: (response) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'receipt' }),
                      {
                        totalReceipts: response.totalItems,
                        receiptsCallState: successCallState(null),
                      },
                    );
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { receiptsCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Property readReceipt
       * @readonly
       *
       * @description
       * Reads the retained physical receipt and its latest revision independently of paginated
       * history.
       */
      readReceipt: rxMethod<{ organizationId: string; receiptId: string }>(
        pipe(
          switchMap(({ organizationId, receiptId }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { receiptCallState: pendingCallState() });
            return service.readReceipt(organizationId, receiptId).pipe(
              tapResponse({
                next: (receipt) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { receiptCallState: successCallState(receipt) });
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { receiptCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Property readReturn
       * @readonly
       *
       * @description
       * Explicitly reads a physical return revision without losing its source when pagination
       * changes.
       */
      readReturn: rxMethod<{ organizationId: string; returnId: string }>(
        pipe(
          switchMap(({ organizationId, returnId }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            patchState(store, { returnCallState: pendingCallState() });
            return service.readReturn(organizationId, returnId).pipe(
              tapResponse({
                next: (returned) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { returnCallState: successCallState(returned) });
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { returnCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Property loadReturns
       * @readonly
       *
       * @description
       * Reads paginated physical declarations and their separate inventory reconciliation status.
       */
      loadReturns: rxMethod<{
        organizationId: string;
        receiptId: string;
        options?: RequestOptions;
      }>(
        pipe(
          switchMap(({ organizationId, receiptId, options }) => {
            if (store.organizationId() !== organizationId) return EMPTY;
            const scopeVersion = store.scopeVersion();
            if (store.returnReceiptId() !== receiptId)
              patchState(store, removeAllEntities({ collection: 'supplyReturn' }));
            patchState(store, { returnReceiptId: receiptId, returnsCallState: pendingCallState() });
            return service.listReturns(organizationId, receiptId, options).pipe(
              tapResponse({
                next: (response) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'supplyReturn' }),
                      {
                        totalReturns: response.totalItems,
                        returnsCallState: successCallState(null),
                      },
                    );
                },
                error: (error: unknown) => {
                  if (store.scopeVersion() === scopeVersion)
                    patchState(store, { returnsCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * @description
       * Uses the unchanged uncertain command for retry and never cancels a running write.
       */
      execute: rxMethod<ProcurementCommand>(
        pipe(
          exhaustMap((proposed) => {
            const state = store.commandCallState();
            const retained = store.command();
            const command =
              retained &&
              state.status === 'error' &&
              (state.error?.retryable || state.error?.code === 0)
                ? retained
                : prepareCreation(proposed);
            const scopeVersion = store.scopeVersion();
            patchState(store, { command, commandCallState: pendingCallState() });
            return request(command).pipe(
              tapResponse({
                next: (result) => {
                  if (store.command() !== command) return;
                  const currentScope =
                    store.organizationId() === command.organizationId &&
                    store.scopeVersion() === scopeVersion;
                  patchState(store, {
                    commandCallState: currentScope
                      ? successCallState(result)
                      : idleCallState<ProcurementMutationOutput>(),
                    command: null,
                  });
                  if (currentScope) {
                    dispatcher.dispatch(
                      procurementStoreEvents.saved({
                        organizationId: command.organizationId,
                        command,
                        result,
                      }),
                    );
                  }
                },
                error: (error: unknown) => {
                  if (store.command() === command)
                    patchState(store, { commandCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method clearCommand
       * @method clearCommand
       *
       * @description
       * Clears a confirmed rejection so its draft can be edited; uncertain physical facts remain
       * locked.
       *
       * @access public
       * @since unreleased
       *
       * @returns {void} No return value; emits or updates the local draft only.
       */
      clearCommand(): void {
        if (store.commandPending() || store.uncertainCommand()) return;
        patchState(store, { command: null, commandCallState: idleCallState() });
      },
      /**
       * Method clearOrder
       * @method clearOrder
       *
       * @description
       * Clears a previous source order before selecting a different purchase context.
       *
       * @access public
       * @since unreleased
       *
       * @returns {void} No return value; emits or updates the local draft only.
       */
      clearOrder(): void {
        if (store.commandPending() || store.uncertainCommand()) return;
        patchState(
          store,
          removeAllEntities({ collection: 'receipt' }),
          removeAllEntities({ collection: 'supplyReturn' }),
          {
            orderCallState: idleCallState(),
            receiptCallState: idleCallState(),
            returnCallState: idleCallState(),
            receiptsCallState: idleCallState(),
            receiptOrderId: null,
            totalReceipts: 0,
            returnsCallState: idleCallState(),
            returnReceiptId: null,
            totalReturns: 0,
          },
        );
      },
    };
  }),
);

/**
 * Type ProcurementStoreType
 *
 * @description
 * Public instance shape consumed by the owning workspace and its tests.
 *
 * @type {ProcurementStoreType}
 */
export type ProcurementStoreType = InstanceType<typeof ProcurementStore>;
