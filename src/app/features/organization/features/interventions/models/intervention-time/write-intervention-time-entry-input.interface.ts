/**
 * Interface WriteInterventionTimeEntryInput
 * @interface WriteInterventionTimeEntryInput
 *
 * @description
 * Explicit manual entry or correction; no operational state is changed.
 *
 * @since 1.0.0
 */
export interface WriteInterventionTimeEntryInput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable UUID for idempotent creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Actual contributor.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property workedOn
   * @readonly
   *
   * @description
   * Local date in the organization's timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workedOn: string;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Integral duration from 1 to 1440.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly minutes: number;

  /**
   * Property note
   * @readonly
   *
   * @description
   * Optional note up to 2000 characters.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly note: string | null;
}
