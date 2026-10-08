import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import type {
  ChangeSupplierInput,
  CreateSupplierInput,
  SupplierOutput,
  ChangePurchaseOrderInput,
  CreatePurchaseOrderInput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ReceivePurchaseOrderInput,
  IndividualizeReceiptInput,
  ReturnProcurementReceiptInput,
  ProcurementReturnOutput,
  ReconcileProcurementReturnInput,
} from '@features/organization/features/procurement/models';

/**
 * Class ProcurementService
 * @class ProcurementService
 *
 * @description
 * Exact internal procurement transport. The backend owns lifecycle, quantity bounds and finance.
 *
 * @since unreleased
 */
@Service()
export class ProcurementService extends HydraApiService {
  //#region Methods
  /**
   * Method listSuppliers
   * @method listSuppliers
   *
   * @description
   * Reads the server-paginated supplier directory.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {RequestOptions} options - Server-side pagination and declared filters.
   *
   * @returns {Observable<HydraCollection<SupplierOutput>>} Authorized server projection; failures
   *   propagate to the owning store.
   */
  public listSuppliers(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<SupplierOutput>> {
    return this.getCollection<SupplierOutput>(
      `/api/organizations/${organizationId}/procurement/suppliers`,
      options,
    );
  }

  /**
   * Method readSupplier
   * @method readSupplier
   *
   * @description
   * Reads a retained supplier independently of the active directory page.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {string} supplierId - Displayed server resource or stable identifier.
   *
   * @returns {Observable<SupplierOutput>} Authorized server projection; failures propagate to the
   *   owning store.
   */
  public readSupplier(organizationId: string, supplierId: string): Observable<SupplierOutput> {
    return this.getOne<SupplierOutput>(
      `/api/organizations/${organizationId}/procurement/suppliers/${supplierId}`,
    );
  }

  /**
   * Method createSupplier
   * @method createSupplier
   *
   * @description
   * Creates an internal supplier with no external account.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {CreateSupplierInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<SupplierOutput>} Authorized server projection; failures propagate to the
   *   owning store.
   */
  public createSupplier(
    organizationId: string,
    input: CreateSupplierInput,
  ): Observable<SupplierOutput> {
    return this.post<CreateSupplierInput, SupplierOutput>(
      `/api/organizations/${organizationId}/procurement/suppliers`,
      input,
    );
  }

  /**
   * Method updateSupplier
   * @method updateSupplier
   *
   * @description
   * Changes supplier fields against the displayed revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {SupplierOutput} supplier - Displayed server resource or stable identifier.
   * @param {ChangeSupplierInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<SupplierOutput>} Authorized server projection; failures propagate to the
   *   owning store.
   */
  public updateSupplier(
    organizationId: string,
    supplier: SupplierOutput,
    input: ChangeSupplierInput,
  ): Observable<SupplierOutput> {
    return this.patch<ChangeSupplierInput, SupplierOutput>(
      `/api/organizations/${organizationId}/procurement/suppliers/${supplier.id}`,
      input,
      { headers: { 'If-Match': `"revision-${supplier.revision}"` } },
    );
  }

  /**
   * Method archiveSupplier
   * @method archiveSupplier
   *
   * @description
   * Archives a supplier while retaining previous purchase records.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {SupplierOutput} supplier - Displayed server resource or stable identifier.
   *
   * @returns {Observable<SupplierOutput>} Authorized server projection; failures propagate to the
   *   owning store.
   */
  public archiveSupplier(
    organizationId: string,
    supplier: SupplierOutput,
  ): Observable<SupplierOutput> {
    return this.post<Record<string, never>, SupplierOutput>(
      `/api/organizations/${organizationId}/procurement/suppliers/${supplier.id}/archive`,
      {},
      { headers: { 'If-Match': `"revision-${supplier.revision}"` } },
    );
  }

  /**
   * Method listOrders
   * @method listOrders
   *
   * @description
   * Reads the server-paginated purchase order lifecycle.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {RequestOptions} options - Server-side pagination and declared filters.
   *
   * @returns {Observable<HydraCollection<PurchaseOrderOutput>>} Authorized server projection;
   *   failures propagate to the owning store.
   */
  public listOrders(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<PurchaseOrderOutput>> {
    return this.getCollection<PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders`,
      options,
    );
  }

  /**
   * Method readOrder
   * @method readOrder
   *
   * @description
   * Reads the selected order with its current server quantities and revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {string} orderId - Displayed server resource or stable identifier.
   *
   * @returns {Observable<PurchaseOrderOutput>} Authorized server projection; failures propagate to
   *   the owning store.
   */
  public readOrder(organizationId: string, orderId: string): Observable<PurchaseOrderOutput> {
    return this.getOne<PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${orderId}`,
    );
  }

  /**
   * Method createOrder
   * @method createOrder
   *
   * @description
   * Creates an internal draft with exact quantities and optional authorized costs.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {CreatePurchaseOrderInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<PurchaseOrderOutput>} Authorized server projection; failures propagate to
   *   the owning store.
   */
  public createOrder(
    organizationId: string,
    input: CreatePurchaseOrderInput,
  ): Observable<PurchaseOrderOutput> {
    return this.post<CreatePurchaseOrderInput, PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders`,
      input,
    );
  }

  /**
   * Method updateOrder
   * @method updateOrder
   *
   * @description
   * Changes an order draft against the revision the user reviewed.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {PurchaseOrderOutput} order - Displayed server resource or stable identifier.
   * @param {ChangePurchaseOrderInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<PurchaseOrderOutput>} Authorized server projection; failures propagate to
   *   the owning store.
   */
  public updateOrder(
    organizationId: string,
    order: PurchaseOrderOutput,
    input: ChangePurchaseOrderInput,
  ): Observable<PurchaseOrderOutput> {
    return this.patch<ChangePurchaseOrderInput, PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${order.id}`,
      input,
      { headers: { 'If-Match': `"revision-${order.revision}"` } },
    );
  }

  /**
   * Method placeOrder
   * @method placeOrder
   *
   * @description
   * Explicitly places an order without implying any physical receipt.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {PurchaseOrderOutput} order - Displayed server resource or stable identifier.
   *
   * @returns {Observable<PurchaseOrderOutput>} Authorized server projection; failures propagate to
   *   the owning store.
   */
  public placeOrder(
    organizationId: string,
    order: PurchaseOrderOutput,
  ): Observable<PurchaseOrderOutput> {
    return this.post<Record<string, never>, PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${order.id}/order`,
      {},
      { headers: { 'If-Match': `"revision-${order.revision}"` } },
    );
  }

  /**
   * Method cancelRemaining
   * @method cancelRemaining
   *
   * @description
   * Cancels only undelivered quantities and keeps physical history.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {PurchaseOrderOutput} order - Displayed server resource or stable identifier.
   *
   * @returns {Observable<PurchaseOrderOutput>} Authorized server projection; failures propagate to
   *   the owning store.
   */
  public cancelRemaining(
    organizationId: string,
    order: PurchaseOrderOutput,
  ): Observable<PurchaseOrderOutput> {
    return this.post<Record<string, never>, PurchaseOrderOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${order.id}/cancel-remaining`,
      {},
      { headers: { 'If-Match': `"revision-${order.revision}"` } },
    );
  }

  /**
   * Method listReceipts
   * @method listReceipts
   *
   * @description
   * Reads physical receipts linked to a selected source order.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {string} orderId - Displayed server resource or stable identifier.
   * @param {RequestOptions} options - Server-side pagination and declared filters.
   *
   * @returns {Observable<HydraCollection<ProcurementReceiptOutput>>} Authorized server projection;
   *   failures propagate to the owning store.
   */
  public listReceipts(
    organizationId: string,
    orderId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ProcurementReceiptOutput>> {
    return this.getCollection<ProcurementReceiptOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${orderId}/receipts`,
      options,
    );
  }

  /**
   * Method readReceipt
   * @method readReceipt
   *
   * @description
   * Reads a retained receipt and its reserve equipment or stock movement.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {string} receiptId - Displayed server resource or stable identifier.
   *
   * @returns {Observable<ProcurementReceiptOutput>} Authorized server projection; failures
   *   propagate to the owning store.
   */
  public readReceipt(
    organizationId: string,
    receiptId: string,
  ): Observable<ProcurementReceiptOutput> {
    return this.getOne<ProcurementReceiptOutput>(
      `/api/organizations/${organizationId}/procurement/receipts/${receiptId}`,
    );
  }

  /**
   * Method receiveOrder
   * @method receiveOrder
   *
   * @description
   * Records one physical delivery atomically using its stable operation UUID.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {PurchaseOrderOutput} order - Displayed server resource or stable identifier.
   * @param {ReceivePurchaseOrderInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<ProcurementReceiptOutput>} Authorized server projection; failures
   *   propagate to the owning store.
   */
  public receiveOrder(
    organizationId: string,
    order: PurchaseOrderOutput,
    input: ReceivePurchaseOrderInput,
  ): Observable<ProcurementReceiptOutput> {
    return this.post<ReceivePurchaseOrderInput, ProcurementReceiptOutput>(
      `/api/organizations/${organizationId}/procurement/orders/${order.id}/receipts`,
      input,
      { headers: { 'If-Match': `"revision-${order.revision}"` } },
    );
  }

  /**
   * Method individualizeReceipt
   * @method individualizeReceipt
   *
   * @description
   * Confirms reserve equipment creation without duplicating replayed units.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {ProcurementReceiptOutput} receipt - Displayed server resource or stable identifier.
   * @param {IndividualizeReceiptInput} input - Exact transport payload preserved unchanged for an
   *   identical retry.
   *
   * @returns {Observable<ProcurementReceiptOutput>} Authorized server projection; failures
   *   propagate to the owning store.
   */
  public individualizeReceipt(
    organizationId: string,
    receipt: ProcurementReceiptOutput,
    input: IndividualizeReceiptInput,
  ): Observable<ProcurementReceiptOutput> {
    return this.post<IndividualizeReceiptInput, ProcurementReceiptOutput>(
      `/api/organizations/${organizationId}/procurement/receipts/${receipt.id}/individualize`,
      input,
      { headers: { 'If-Match': `"revision-${receipt.revision}"` } },
    );
  }

  /**
   * Method returnReceipt
   * @method returnReceipt
   *
   * @description
   * Records a motivated return against its retained physical receipt.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization, used for tenant authorization.
   * @param {ProcurementReceiptOutput} receipt - Displayed server resource or stable identifier.
   * @param {ReturnProcurementReceiptInput} input - Exact transport payload preserved unchanged for
   *   an identical retry.
   *
   * @returns {Observable<ProcurementReceiptOutput>} Authorized server projection; failures
   *   propagate to the owning store.
   */
  public returnReceipt(
    organizationId: string,
    receipt: ProcurementReceiptOutput,
    input: ReturnProcurementReceiptInput,
  ): Observable<ProcurementReceiptOutput> {
    return this.post<ReturnProcurementReceiptInput, ProcurementReceiptOutput>(
      `/api/organizations/${organizationId}/procurement/receipts/${receipt.id}/returns`,
      input,
      { headers: { 'If-Match': `"revision-${receipt.revision}"` } },
    );
  }

  /**
   * Method listReturns
   * @method listReturns
   *
   * @description
   * Reads physical returns without hiding stock reconciliation still to perform.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority for the request.
   * @param {string} receiptId - Retained physical source receipt UUID.
   * @param {RequestOptions} options - Server-side pagination and authorized query filters.
   *
   * @returns {Observable<HydraCollection<ProcurementReturnOutput>>} Authorized server projection;
   *   failures propagate to the owning store.
   */
  public listReturns(
    organizationId: string,
    receiptId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<ProcurementReturnOutput>> {
    return this.getCollection<ProcurementReturnOutput>(
      `/api/organizations/${organizationId}/procurement/receipts/${receiptId}/returns`,
      options,
    );
  }

  /**
   * Method readReturn
   * @method readReturn
   *
   * @description
   * Reads one retained immutable physical return and its latest reconciliation revision.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority for the request.
   * @param {string} returnId - Retained physical return UUID.
   *
   * @returns {Observable<ProcurementReturnOutput>} Authorized server projection; failures propagate
   *   to the owning store.
   */
  public readReturn(organizationId: string, returnId: string): Observable<ProcurementReturnOutput> {
    return this.getOne<ProcurementReturnOutput>(
      `/api/organizations/${organizationId}/procurement/returns/${returnId}`,
    );
  }

  /**
   * Method reconcileReturn
   * @method reconcileReturn
   *
   * @description
   * Explicitly retries the inventory movement; the original quantity and reason remain retained.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} organizationId - Owning organization authority for the request.
   * @param {ProcurementReturnOutput} returned - Displayed physical return with its current
   *   reconciliation revision.
   * @param {ReconcileProcurementReturnInput} input - Exact transport payload preserved unchanged
   *   for an identical retry.
   *
   * @returns {Observable<ProcurementReturnOutput>} Authorized server projection; failures propagate
   *   to the owning store.
   */
  public reconcileReturn(
    organizationId: string,
    returned: ProcurementReturnOutput,
    input: ReconcileProcurementReturnInput,
  ): Observable<ProcurementReturnOutput> {
    return this.post<ReconcileProcurementReturnInput, ProcurementReturnOutput>(
      `/api/organizations/${organizationId}/procurement/returns/${returned.id}/reconcile`,
      input,
      { headers: { 'If-Match': `"revision-${returned.revision}"` } },
    );
  }
  //#endregion
}
