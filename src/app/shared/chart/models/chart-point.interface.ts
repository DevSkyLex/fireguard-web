/**
 * Interface ChartPoint
 * @interface ChartPoint
 *
 * @description
 * One plotted value against a category — a date, a time-bucket label, or a
 * bare string. The category kind stays generic here; the component decides
 * how it is formatted on the axis.
 *
 * @since 1.0.0
 */
export interface ChartPoint {
  /**
   * Property label
   * @readonly
   *
   * @description Category displayed on the chart axis.
   * @access public
   * @since 1.0.0
   * @type {string | Date}
   */
  readonly label: string | Date;

  /**
   * Property value
   * @readonly
   *
   * @description Finite plotted value, or null when the source sample is unavailable.
   * @access public
   * @since 1.0.0
   * @type {number | null}
   */
  readonly value: number | null;
}
