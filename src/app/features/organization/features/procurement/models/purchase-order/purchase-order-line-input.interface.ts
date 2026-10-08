import type { ProcurementLineKind } from './procurement-line-kind.type';
/**
 * Interface PurchaseOrderLineInput
 * @interface PurchaseOrderLineInput
 *
 * @description
 * Exact draft line, keeping stock articles distinct from individual equipment.
 */
export interface PurchaseOrderLineInput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Existing stable line UUID, or omitted for server allocation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id?: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * The line's stock or park responsibility.
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
   * Article UUID for a stock line only.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly partId?: string | null;

  /**
   * Property typeCode
   * @readonly
   *
   * @description
   * Server catalogue code for an equipment line only.
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
   * Declarative equipment identity copied when reserve units are created.
   *
   * @access public
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  readonly identityTemplate?: Readonly<Record<string, unknown>>;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Positive decimal string with six fractional digits; whole units for equipment.
   *
   * @access public
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property unitCost
   * @readonly
   *
   * @description
   * Optional exact six-digit internal cost; only financial managers may send it.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly unitCost?: string | null;
}
