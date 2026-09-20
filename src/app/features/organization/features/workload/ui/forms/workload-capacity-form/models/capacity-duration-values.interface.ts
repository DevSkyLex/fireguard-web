/**
 * Interface CapacityDurationValues
 * @interface CapacityDurationValues
 *
 * @description
 * Explicit duration parts. Blank hours mean unknown; blank minutes mean no fractional hour.
 *
 * @since 1.0.0
 */
export interface CapacityDurationValues {
  /**
   * Property hours
   *
   * @description
   * Whole hours entered by the operator.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  hours: string;

  /**
   * Property minutes
   *
   * @description
   * Additional minutes within the hour.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  minutes: string;
}
