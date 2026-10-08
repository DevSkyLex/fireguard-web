/**
 * Type MaintenanceReportGroupBy
 *
 * @description
 * Server-owned financial allocation dimension; each contribution is counted once.
 *
 * @type MaintenanceReportGroupBy
 */
export type MaintenanceReportGroupBy = 'equipment' | 'site' | 'customer';

/**
 * Interface MaintenanceReportQuery
 * @interface MaintenanceReportQuery
 *
 * @description
 * Inclusive civil-date window and explicit organization-owned filters for one report page.
 */
export interface MaintenanceReportQuery {
  /**
   * Property from
   * @readonly
   *
   * @description
   * Inclusive first civil date in YYYY-MM-DD format.
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
   * Inclusive last civil date, at most 366 days after the first date inclusive.
   *
   * @access public
   *
   * @type {string}
   */
  readonly to: string;

  /**
   * Property groupBy
   * @readonly
   *
   * @description
   * Grouping dimension authorized and calculated by the server.
   *
   * @access public
   *
   * @type {MaintenanceReportGroupBy}
   */
  readonly groupBy: MaintenanceReportGroupBy;

  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Optional named site selected from the private financial directory.
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
   * Optional named internal customer selected from the private financial directory.
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
   * Optional individual equipment selected from the private financial directory.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly equipmentId?: string;

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based server result page.
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
   * Requested bounded page size, independent of filtered report totals.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;
}
