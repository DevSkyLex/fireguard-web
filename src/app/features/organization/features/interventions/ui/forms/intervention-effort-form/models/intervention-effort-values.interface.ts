/**
 * Interface InterventionEffortValues
 * @interface InterventionEffortValues
 *
 * @description
 * Partial planning or reestimation input.
 *
 * @since 1.0.0
 */
export interface InterventionEffortValues {
  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Effort in whole minutes or unknown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly minutes: string;

  /**
   * Property assignee
   * @readonly
   *
   * @description
   * Organization member IRI or unassigned.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly assignee: string;

  /**
   * Property workStartsOn
   * @readonly
   *
   * @description
   * Optional local start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workStartsOn: string;

  /**
   * Property workEndsOn
   * @readonly
   *
   * @description
   * Optional local end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workEndsOn: string;
}
