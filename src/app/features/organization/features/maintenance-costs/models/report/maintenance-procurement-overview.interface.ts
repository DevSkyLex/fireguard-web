/**
 * Interface MaintenanceProcurementAmount
 * @interface MaintenanceProcurementAmount
 *
 * @description
 * Exact purchase amount with an explicit incomplete known subtotal.
 */
export interface MaintenanceProcurementAmount {
  /**
   * Property total
   * @readonly
   *
   * @description
   * Complete amount, omitted if positive quantities have unknown prices.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly total?: string | null;

  /**
   * Property knownTotal
   * @readonly
   *
   * @description
   * Exact subtotal of quantities with known purchase prices.
   *
   * @access public
   *
   * @type {string}
   */
  readonly knownTotal: string;

  /**
   * Property complete
   * @readonly
   *
   * @description
   * Whether every selected positive quantity has a known purchase price.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly complete: boolean;
}

/**
 * Interface MaintenanceProcurementOverview
 * @interface MaintenanceProcurementOverview
 *
 * @description
 * Organization procurement commitments for orders created during the report window.
 */
export interface MaintenanceProcurementOverview {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Authorized owning organization identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Single organization currency.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Inclusive order-creation start instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly from: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Exclusive order-creation end instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly to: string;

  /**
   * Property orderCount
   * @readonly
   *
   * @description
   * Selected non-draft orders including cancelled orders with retained deliveries.
   *
   * @access public
   *
   * @type {number}
   */
  readonly orderCount: number;

  /**
   * Property receiptCount
   * @readonly
   *
   * @description
   * Physical receipts over selected orders' entire history.
   *
   * @access public
   *
   * @type {number}
   */
  readonly receiptCount: number;

  /**
   * Property pendingIndividualizationCount
   * @readonly
   *
   * @description
   * Equipment receipts still awaiting individualization in the park.
   *
   * @access public
   *
   * @type {number}
   */
  readonly pendingIndividualizationCount: number;

  /**
   * Property ordered
   * @readonly
   *
   * @description
   * Effective commitments excluding cancelled remainder.
   *
   * @access public
   *
   * @type {MaintenanceProcurementAmount}
   */
  readonly ordered: MaintenanceProcurementAmount;

  /**
   * Property received
   * @readonly
   *
   * @description
   * Gross delivered value before supplier returns.
   *
   * @access public
   *
   * @type {MaintenanceProcurementAmount}
   */
  readonly received: MaintenanceProcurementAmount;

  /**
   * Property outstanding
   * @readonly
   *
   * @description
   * Remaining quantity receivable; supplier returns do not reopen this amount.
   *
   * @access public
   *
   * @type {MaintenanceProcurementAmount}
   */
  readonly outstanding: MaintenanceProcurementAmount;

  /**
   * Property returned
   * @readonly
   *
   * @description
   * Declared supplier returns including pending stock reconciliation.
   *
   * @access public
   *
   * @type {MaintenanceProcurementAmount}
   */
  readonly returned: MaintenanceProcurementAmount;

  /**
   * Property basis
   * @readonly
   *
   * @description
   * The order creation window governs procurement selection.
   *
   * @access public
   *
   * @type {'order_created_at'}
   */
  readonly basis: 'order_created_at';

  /**
   * Property receiptScope
   * @readonly
   *
   * @description
   * Receipts and returns include selected orders' complete histories.
   *
   * @access public
   *
   * @type {'selected_orders_all_history'}
   */
  readonly receiptScope: 'selected_orders_all_history';
}
