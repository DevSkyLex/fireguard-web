import type { InventoryRecord } from '@features/organization/features/inventory/state/inventory';

/**
 * Interface InventoryRow
 * @interface InventoryRow
 *
 * @description
 * Quantity-only row projection, independent from API and page state.
 */
export interface InventoryRow {
  /**
   * Property archived
   * @readonly
   *
   * @description
   * Retained reference is archived.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly archived?: boolean;
  /**
   * Property record
   * @readonly
   *
   * @description
   * Canonical original fact for explicit row actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryRecord}
   */
  readonly record: InventoryRecord;
  /**
   * Property title
   * @readonly
   *
   * @description
   * Human name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly title: string;
  /**
   * Property detail
   * @readonly
   *
   * @description
   * Stable reference code or warehouse.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly detail: string;
  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact transport decimal string, never floating-point formatted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly quantity?: string;
  /**
   * Property unit
   * @readonly
   *
   * @description
   * Declared stock unit.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly unit?: string;
  /**
   * Property status
   * @readonly
   *
   * @description
   * Human lifecycle or declaration state.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly status?: string;
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Server received declaration still requiring reconciliation.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly pending?: boolean;
  /**
   * Property date
   * @readonly
   *
   * @description
   * Original physical occurrence timestamp.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly date?: string;
  /**
   * Property reason
   * @readonly
   *
   * @description
   * Motivation or explicit reconciliation reason.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly reason?: string;
  /**
   * Property late
   * @readonly
   *
   * @description
   * Declaration received after the dossier was published.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly late?: boolean;
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Linked work dossier.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly interventionId?: string;
  /**
   * Property canEdit
   * @readonly
   *
   * @description
   * Caller-authorized reference mutation.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly canEdit?: boolean;
  /**
   * Property canArchive
   * @readonly
   *
   * @description
   * Caller-authorized archive lifecycle.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly canArchive?: boolean;
  /**
   * Property canReconcile
   * @readonly
   *
   * @description
   * Caller-authorized whole declaration reconciliation.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly canReconcile?: boolean;
  /**
   * Property canReturn
   * @readonly
   *
   * @description
   * Caller-authorized physical return from a confirmed consumption.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly canReturn?: boolean;
}

/**
 * Type InventoryRowAction
 *
 * @description
 * Stateless dataview asks its host to execute a specific intent.
 *
 * @type InventoryRowAction
 */
export type InventoryRowAction = {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Requested explicit row action.
   *
   * @access public
   * @since unreleased
   *
   * @type {'edit' | 'archive' | 'reconcile' | 'return'}
   */
  readonly kind: 'edit' | 'archive' | 'reconcile' | 'return';
  /**
   * Property record
   * @readonly
   *
   * @description
   * Canonical original record for action authority.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryRecord}
   */
  readonly record: InventoryRecord;
};
