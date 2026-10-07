/**
 * Interface MaintenanceEconomicAmount
 * @interface MaintenanceEconomicAmount
 *
 * @description
 * Exact complete total and separately retained known subtotal; unknown facts never become zero.
 */
export interface MaintenanceEconomicAmount {
  /**
   * Property total
   * @readonly
   *
   * @description
   * Complete six-place total, omitted when one or more facts lack valuation.
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
   * Exact known subtotal across the full filtered scope, independent of pagination.
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
   * Whether every retained contribution has a valuation.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly complete: boolean;

  /**
   * Property contributionCount
   * @readonly
   *
   * @description
   * Number of retained source contributions, including unknown values.
   *
   * @access public
   *
   * @type {number}
   */
  readonly contributionCount: number;

  /**
   * Property unknownCount
   * @readonly
   *
   * @description
   * Number of source contributions whose valuation is unknown.
   *
   * @access public
   *
   * @type {number}
   */
  readonly unknownCount: number;
}
