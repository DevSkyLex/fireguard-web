import type { HydraItem } from '@core/api/models';

/**
 * Interface ProcurementReturnOutput
 * @interface ProcurementReturnOutput
 *
 * @description
 * Retained physical supplier return with separate inventory reconciliation.
 */
export interface ProcurementReturnOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable physical return UUID.
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
   * Owning organization.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property receiptId
   * @readonly
   *
   * @description
   * Retained physical source receipt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly receiptId: string;

  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * UUID of the original physical declaration, unchanged by reconciliation attempts.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact physically returned quantity.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Original motivated physical return reason.
   *
   * @access public
   *
   * @type {string}
   */
  readonly reason: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Inventory reconciliation status, separate from the retained physical fact.
   *
   * @access public
   *
   * @type {'awaiting_reconciliation' | 'confirmed'}
   */
  readonly status: 'awaiting_reconciliation' | 'confirmed';

  /**
   * Property inventoryMovementId
   * @readonly
   *
   * @description
   * Confirmed inventory movement, absent while reconciliation is pending.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly inventoryMovementId?: string | null;

  /**
   * Property blockedReason
   * @readonly
   *
   * @description
   * Reason the stock movement could not yet be confirmed.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly blockedReason?: string | null;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Original declaration instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property reconciledAt
   * @readonly
   *
   * @description
   * Confirmation instant, absent while stock reconciliation is pending.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly reconciledAt?: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Displayed revision for an explicit reconciliation attempt.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Whether the current attempt was acknowledged as a replay.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
