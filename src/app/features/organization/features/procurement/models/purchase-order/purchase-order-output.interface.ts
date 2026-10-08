import type { HydraItem } from '@core/api/models';
import type { PurchaseOrderLineOutput } from './purchase-order-line-output.interface';
import type { PurchaseOrderStatus } from './purchase-order-status.type';
/**
 * Interface PurchaseOrderOutput
 * @interface PurchaseOrderOutput
 *
 * @description
 * Authorized internal purchase order with server-owned lifecycle and currency.
 */
export interface PurchaseOrderOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable purchase UUID.
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
   * Property supplierId
   * @readonly
   *
   * @description
   * Retained internal supplier UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly supplierId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable purchase reference.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Organization currency frozen by the backend.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-owned lifecycle state.
   *
   * @access public
   *
   * @type {PurchaseOrderStatus}
   */
  readonly status: PurchaseOrderStatus;

  /**
   * Property lines
   * @readonly
   *
   * @description
   * Retained order lines and their server quantities.
   *
   * @access public
   *
   * @type {readonly PurchaseOrderLineOutput[]}
   */
  readonly lines: readonly PurchaseOrderLineOutput[];

  /**
   * Property financialVisible
   * @readonly
   *
   * @description
   * Whether internal unit costs were authorized in this projection.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly financialVisible: boolean;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Displayed optimistic revision for mutations.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Original creation instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Most recent mutation instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;

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
}
