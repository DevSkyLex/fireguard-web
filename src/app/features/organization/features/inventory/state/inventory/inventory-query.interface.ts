import type { InventoryConsumptionStatus } from '@features/organization/features/inventory/models';

/**
 * Type InventorySection
 *
 * @description
 * Organization stock directory sections.
 *
 * @type InventorySection
 */
export type InventorySection = 'balances' | 'parts' | 'warehouses' | 'consumptions' | 'movements';

/**
 * Interface InventoryQuery
 * @interface InventoryQuery
 *
 * @description
 * Server pagination and filters never masquerade as page-local matching.
 */
export interface InventoryQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property userId
   * @readonly
   *
   * @description
   * Authenticated account owning pending physical commands.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly userId: string;
  /**
   * Property section
   * @readonly
   *
   * @description
   * Requested directory.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventorySection}
   */
  readonly section: InventorySection;
  /**
   * Property page
   * @readonly
   *
   * @description
   * Server page starting at one.
   *
   * @access public
   * @since unreleased
   *
   * @type {number | undefined}
   */
  readonly page?: number;
  /**
   * Property search
   * @readonly
   *
   * @description
   * Server reference search.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly search?: string;
  /**
   * Property archived
   * @readonly
   *
   * @description
   * Reference archive filter.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly archived?: boolean;
  /**
   * Property partId
   * @readonly
   *
   * @description
   * Optional exact part filter.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly partId?: string;
  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Optional exact warehouse filter.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly warehouseId?: string;
  /**
   * Property status
   * @readonly
   *
   * @description
   * Optional declaration status.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryConsumptionStatus | undefined}
   */
  readonly status?: InventoryConsumptionStatus;
}
