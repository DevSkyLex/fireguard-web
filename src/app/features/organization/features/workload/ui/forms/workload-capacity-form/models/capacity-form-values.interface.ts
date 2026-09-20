import type { CapacityDurationValues } from './capacity-duration-values.interface';

/**
 * Interface CapacityFormValues
 * @interface CapacityFormValues
 *
 * @description
 * Editable weekly capacity. Blank hours represent missing daily capacity, never zero.
 *
 * @since 1.0.0
 */
export interface CapacityFormValues {
  /**
   * Property effectiveOn
   *
   * @description
   * Calendar date selected by the picker; serialized to a local ISO date on submission.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Date | null}
   */
  effectiveOn: Date | null;

  /**
   * Property days
   *
   * @description
   * ISO Monday-to-Sunday daily capacities.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CapacityDurationValues[]}
   */
  days: CapacityDurationValues[];
}

/**
 * Interface CapacityExceptionFormValues
 * @interface CapacityExceptionFormValues
 *
 * @description
 * Inclusive date range and actual daily availability.
 *
 * @since 1.0.0
 */
export interface CapacityExceptionFormValues {
  /**
   * Property startsOn
   *
   * @description
   * First affected local date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  startsOn: string;

  /**
   * Property endsOn
   *
   * @description
   * Last affected local date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  endsOn: string;

  /**
   * Property duration
   *
   * @description
   * Available duration, not a duration to subtract.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CapacityDurationValues}
   */
  duration: CapacityDurationValues;
}
