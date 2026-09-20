/**
 * Interface CapacityWeekInput
 * @interface CapacityWeekInput
 *
 * @description
 * Effective-dated replacement of an organization or member week.
 *
 * @since 1.0.0
 */
export interface CapacityWeekInput {
  /**
   * Property effectiveOn
   * @readonly
   *
   * @description
   * First local date using this week.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly effectiveOn: string;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Seven integral capacities, ISO Monday through Sunday; no assumed defaults.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  readonly minutes: readonly number[];
}
