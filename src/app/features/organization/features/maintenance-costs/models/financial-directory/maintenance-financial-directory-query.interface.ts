/**
 * Interface MaintenanceFinancialDirectoryQuery
 * @interface MaintenanceFinancialDirectoryQuery
 *
 * @description
 * Server-paginated minimal work search; selected identities narrow reports without ordinary read
 * rights.
 */
export interface MaintenanceFinancialDirectoryQuery {
  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based authorized directory page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Explicit bounded number of dossiers to load.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Optional server search over human-readable reference and work name.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly search?: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Optional inclusive publication start date.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly from?: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Optional inclusive publication end date.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly to?: string;

  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Optional server-owned site scope.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly siteId?: string;

  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Optional internal customer scope.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly customerId?: string;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional individual equipment scope.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly equipmentId?: string;
}
