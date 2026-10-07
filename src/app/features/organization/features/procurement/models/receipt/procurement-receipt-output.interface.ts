import type { HydraItem } from '@core/api/models';
import type { ProcurementLineKind } from '../purchase-order/procurement-line-kind.type';
import type { ProcurementReceiptStatus } from './procurement-receipt-status.type';
/**
 * Interface ProcurementReceiptOutput
 * @interface ProcurementReceiptOutput
 *
 * @description
 * Retained physical receipt, stock movement or individual reserve equipment.
 */
export interface ProcurementReceiptOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable receipt UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning tenant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property orderId
   * @readonly
   *
   * @description
   * Retained source order UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly orderId: string;

  /**
   * Property lineId
   * @readonly
   *
   * @description
   * Retained source line UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly lineId: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Stock article or equipment awaiting identities.
   *
   * @access public
   *
   * @type {ProcurementLineKind}
   */
  readonly kind: ProcurementLineKind;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Received decimal quantity, kept exact.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Warehouse UUID for a stock receipt only.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly warehouseId?: string | null;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Retained organization currency.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property receivedAt
   * @readonly
   *
   * @description
   * Actual physical receipt instant with explicit timezone offset.
   *
   * @access public
   *
   * @type {string}
   */
  readonly receivedAt: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Server recording instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property inventoryMovementId
   * @readonly
   *
   * @description
   * Atomic stock movement link, absent for individual equipment.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly inventoryMovementId?: string | null;

  /**
   * Property equipmentIds
   * @readonly
   *
   * @description
   * Reserve equipment created by confirmed individualization.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly equipmentIds: readonly string[];

  /**
   * Property returnedQuantity
   * @readonly
   *
   * @description
   * Motivated returned quantity, retained separately from the gross receipt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly returnedQuantity: string;

  /**
   * Property pendingReturnQuantity
   * @readonly
   *
   * @description
   * Physical returns retained while their inventory movements remain unresolved.
   *
   * @access public
   *
   * @type {string}
   */
  readonly pendingReturnQuantity: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-owned fulfillment state.
   *
   * @access public
   *
   * @type {ProcurementReceiptStatus}
   */
  readonly status: ProcurementReceiptStatus;

  /**
   * Property blockedReason
   * @readonly
   *
   * @description
   * Server reason blocking individualization; physical receipt remains retained.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly blockedReason?: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Displayed optimistic revision for receipt mutations.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property financialVisible
   * @readonly
   *
   * @description
   * Whether financial fields were authorized.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly financialVisible: boolean;

  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Whether this result acknowledged an already accepted operation.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly replayed: boolean;

  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Exact internal cost; absent without permission and null when unknown.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly unitCost?: string | null;
}
