/***
 * Type MetricComparison
 *
 * @description
 * Type representing the comparison payload for a metric,
 * including the value and direction of the comparison.
 */
export type MetricComparison = {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Value of the comparison, such as a
   * percentage or count.
   *
   * @type {string | number | null}
   */
  readonly value: string | number | null;

  /**
   * Property direction
   * @readonly
   *
   * @description
   * Direction of the comparison, indicating whether the
   * metric has improved, declined, or remained stable.
   *
   * Expected values include 'up', 'down', 'neutral', or
   * null if no comparison is available.
   *
   * @type {string | null}
   */
  readonly direction: string | null;
  //#endregion
}
