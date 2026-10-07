import type { ProcurementLineKind } from '@features/organization/features/procurement/models';
/**
 * Interface PurchaseOrderLineDraft
 * @interface PurchaseOrderLineDraft
 *
 * @description
 * Editable line fields remain text, including all exact quantity and cost values.
 */
export interface PurchaseOrderLineDraft {
  /**
   * Property id
   *
   * @description
   * Stable existing or local line UUID.
   *
   * @access public
   *
   * @type {string}
   */
  id: string;

  /**
   * Property kind
   *
   * @description
   * Stock article or individual material.
   *
   * @access public
   *
   * @type {ProcurementLineKind}
   */
  kind: ProcurementLineKind;

  /**
   * Property partId
   *
   * @description
   * Selected stock article.
   *
   * @access public
   *
   * @type {string}
   */
  partId: string;

  /**
   * Property typeCode
   *
   * @description
   * Selected authorized catalogue code.
   *
   * @access public
   *
   * @type {string}
   */
  typeCode: string;

  /**
   * Property quantity
   *
   * @description
   * User-entered exact quantity.
   *
   * @access public
   *
   * @type {string}
   */
  quantity: string;

  /**
   * Property unitCost
   *
   * @description
   * Authorized optional unit cost text.
   *
   * @access public
   *
   * @type {string}
   */
  unitCost: string;

  /**
   * Property name
   *
   * @description
   * Declarative equipment name.
   *
   * @access public
   *
   * @type {string}
   */
  name: string;

  /**
   * Property brand
   *
   * @description
   * Declarative manufacturer.
   *
   * @access public
   *
   * @type {string}
   */
  brand: string;

  /**
   * Property model
   *
   * @description
   * Declarative model.
   *
   * @access public
   *
   * @type {string}
   */
  model: string;

  /**
   * Property identityTemplate
   *
   * @description
   * Retained unknown declarative fields, preserved by editing.
   *
   * @access public
   *
   * @type {Record<string, unknown>}
   */
  identityTemplate: Record<string, unknown>;
}
/**
 * Interface PurchaseOrderDraft
 * @interface PurchaseOrderDraft
 *
 * @description
 * Editable purchase draft; currency is owned by the organization and server.
 */
export interface PurchaseOrderDraft {
  /**
   * Property name
   *
   * @description
   * Internal order name.
   *
   * @access public
   *
   * @type {string}
   */
  name: string;

  /**
   * Property supplierId
   *
   * @description
   * Internal active supplier.
   *
   * @access public
   *
   * @type {string}
   */
  supplierId: string;

  /**
   * Property lines
   *
   * @description
   * Bounded independently identified lines.
   *
   * @access public
   *
   * @type {PurchaseOrderLineDraft[]}
   */
  lines: PurchaseOrderLineDraft[];
}
