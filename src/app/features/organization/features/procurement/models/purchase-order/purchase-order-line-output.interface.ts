import type { ProcurementLineKind } from './procurement-line-kind.type';
/**
 * Interface PurchaseOrderLineOutput
 * @interface PurchaseOrderLineOutput
 *
 * @description
 * Retained line quantities and authorized financial visibility.
 */
export interface PurchaseOrderLineOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable order-line UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Stock article or individual equipment responsibility.
   *
   * @access public
   *
   * @type {ProcurementLineKind}
   */
  readonly kind: ProcurementLineKind;

  /**
   * Property partId
   * @readonly
   *
   * @description
   * Article UUID for a stock line.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly partId?: string | null;

  /**
   * Property partCode
   * @readonly
   *
   * @description
   * Internal article code retained when the order line was prepared.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly partCode?: string | null;

  /**
   * Property partLabel
   * @readonly
   *
   * @description
   * Internal article label retained independently from later catalogue changes.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly partLabel?: string | null;

  /**
   * Property partUnit
   * @readonly
   *
   * @description
   * Original stock article unit; absent only for unmatched historical references.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly partUnit?: string | null;

  /**
   * Property typeCode
   * @readonly
   *
   * @description
   * Server catalogue equipment code.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly typeCode?: string | null;

  /**
   * Property identityTemplate
   * @readonly
   *
   * @description
   * Retained declarative equipment identity; the server may encode empty values as an array.
   *
   * @access public
   *
   * @type {Readonly<Record<string, unknown>> | readonly []}
   */
  readonly identityTemplate: Readonly<Record<string, unknown>> | readonly [];

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Ordered quantity as an exact decimal string.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property receivedQuantity
   * @readonly
   *
   * @description
   * Gross physically received quantity, including subsequently returned units.
   *
   * @access public
   *
   * @type {string}
   */
  readonly receivedQuantity: string;

  /**
   * Property returnedQuantity
   * @readonly
   *
   * @description
   * Motivated supplier returns as an exact decimal string.
   *
   * @access public
   *
   * @type {string}
   */
  readonly returnedQuantity: string;

  /**
   * Property remainingQuantity
   * @readonly
   *
   * @description
   * Backend-calculated quantity still awaiting delivery.
   *
   * @access public
   *
   * @type {string}
   */
  readonly remainingQuantity: string;

  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Authorized exact unit cost; omitted without permission and null when unknown.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly unitCost?: string | null;
}
