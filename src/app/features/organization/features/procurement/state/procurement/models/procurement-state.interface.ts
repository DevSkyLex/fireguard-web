import type { CallState } from '@core/request-state';
import type {
  PurchaseOrderOutput,
  SupplierOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
} from '@features/organization/features/procurement/models';
import type { ProcurementCommand, ProcurementMutationOutput } from './procurement-command.type';

/**
 * Interface ProcurementState
 * @interface ProcurementState
 *
 * @description
 * Scope and named request states for the procurement workspace.
 */
export interface ProcurementState {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Currently displayed organization.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property scopeVersion
   * @readonly
   *
   * @description
   * Monotonic scope generation rejecting responses from superseded visits.
   *
   * @access public
   *
   * @type {number}
   */
  readonly scopeVersion: number;

  /**
   * Property suppliersCallState
   * @readonly
   *
   * @description
   * Supplier directory request, retaining the previous page on refresh.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly suppliersCallState: CallState;

  /**
   * Property supplierCallState
   * @readonly
   *
   * @description
   * Selected supplier detail hydrates labels beyond the current active directory page.
   *
   * @access public
   *
   * @type {CallState<SupplierOutput>}
   */
  readonly supplierCallState: CallState<SupplierOutput>;

  /**
   * Property totalSuppliers
   * @readonly
   *
   * @description
   * Server count for supplier pagination.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalSuppliers: number;

  /**
   * Property ordersCallState
   * @readonly
   *
   * @description
   * Purchase collection request.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly ordersCallState: CallState;

  /**
   * Property totalOrders
   * @readonly
   *
   * @description
   * Server count for order pagination.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalOrders: number;

  /**
   * Property orderCallState
   * @readonly
   *
   * @description
   * Selected source order detail request.
   *
   * @access public
   *
   * @type {CallState<PurchaseOrderOutput>}
   */
  readonly orderCallState: CallState<PurchaseOrderOutput>;

  /**
   * Property receiptCallState
   * @readonly
   *
   * @description
   * Explicit source receipt revision review, independent from the paginated collection.
   *
   * @access public
   *
   * @type {CallState<ProcurementReceiptOutput>}
   */
  readonly receiptCallState: CallState<ProcurementReceiptOutput>;

  /**
   * Property returnCallState
   * @readonly
   *
   * @description
   * Explicit physical return revision review, independent from the paginated history.
   *
   * @access public
   *
   * @type {CallState<ProcurementReturnOutput>}
   */
  readonly returnCallState: CallState<ProcurementReturnOutput>;

  /**
   * Property receiptsCallState
   * @readonly
   *
   * @description
   * Physical receipt collection request for the selected order.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly receiptsCallState: CallState;

  /**
   * Property totalReceipts
   * @readonly
   *
   * @description
   * Server count for receipt pagination.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalReceipts: number;

  /**
   * Property returnsCallState
   * @readonly
   *
   * @description
   * Query state for the selected receipt's physical return history.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly returnsCallState: CallState;

  /**
   * Property totalReturns
   * @readonly
   *
   * @description
   * Server pagination count for retained returns.
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalReturns: number;

  /**
   * Property returnReceiptId
   * @readonly
   *
   * @description
   * Source receipt whose returns are currently displayed.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly returnReceiptId: string | null;

  /**
   * Property receiptOrderId
   * @readonly
   *
   * @description
   * Source order whose physical history is being read.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly receiptOrderId: string | null;

  /**
   * Property commandCallState
   * @readonly
   *
   * @description
   * One serialized write request, separate from all query states.
   *
   * @access public
   *
   * @type {CallState<ProcurementMutationOutput>}
   */
  readonly commandCallState: CallState<ProcurementMutationOutput>;

  /**
   * Property command
   * @readonly
   *
   * @description
   * Unchanged command retained through an uncertain transport result.
   *
   * @access public
   *
   * @type {ProcurementCommand | null}
   */
  readonly command: ProcurementCommand | null;
}
