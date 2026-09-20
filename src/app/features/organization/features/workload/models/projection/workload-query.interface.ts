/**
 * Interface WorkloadQuery
 * @interface WorkloadQuery
 *
 * @description
 * Server filter for one workload read.
 *
 * @since 1.0.0
 */
export interface WorkloadQuery {
  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based member page; contribution calculations remain complete.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly page?: number;

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Number of members to return on a page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly pageSize?: number;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization to read.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property from
   * @readonly
   *
   * @description
   * Inclusive local-date start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly from: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Inclusive local-date end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly to: string;

  /**
   * Property member
   * @readonly
   *
   * @description
   * Optional member filter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly member?: string;

  /**
   * Property team
   * @readonly
   *
   * @description
   * Optional team membership filter; load itself remains organization-wide.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly team?: string;

  /**
   * Property overloaded
   * @readonly
   *
   * @description
   * Only members with daily overload or unavailable work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly overloaded?: boolean;
}
