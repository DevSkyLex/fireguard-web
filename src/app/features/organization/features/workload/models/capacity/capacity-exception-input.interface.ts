/**
 * Interface CapacityExceptionInput
 * @interface CapacityExceptionInput
 *
 * @description
 * Actual daily availability over an inclusive period.
 *
 * @since 1.0.0
 */
export interface CapacityExceptionInput {
  /**
   * Property startsOn
   * @readonly
   *
   * @description
   * First date of the exception.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly startsOn: string;

  /**
   * Property endsOn
   * @readonly
   *
   * @description
   * Last date of the exception.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly endsOn: string;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Available minutes on each date, not minutes to subtract.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly minutes: number;
}
