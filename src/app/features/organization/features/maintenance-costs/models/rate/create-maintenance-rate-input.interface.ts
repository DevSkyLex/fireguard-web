/**
 * Interface CreateMaintenanceRateInput
 * @interface CreateMaintenanceRateInput
 *
 * @description
 * Rate identity and payload are retained together after any uncertain write.
 */
export interface CreateMaintenanceRateInput {
  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Stable client operation UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientId: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Organization member UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property hourlyAmount
   * @readonly
   *
   * @description
   * Exact nonnegative decimal hourly amount.
   *
   * @access public
   *
   * @type {string}
   */
  readonly hourlyAmount: string;

  /**
   * Property effectiveFrom
   * @readonly
   *
   * @description
   * Explicit effective local calendar date.
   *
   * @access public
   *
   * @type {string}
   */
  readonly effectiveFrom: string;
}
