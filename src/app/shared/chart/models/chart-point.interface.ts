/**
 * Interface ChartPoint
 *
 * @description
 * One plotted value against a category — a date, a time-bucket label, or a
 * bare string. The category kind stays generic here; the component decides
 * how it is formatted on the axis.
 *
 * @since 1.0.0
 */
export interface ChartPoint {
  readonly label: string | Date;
  readonly value: number;
}
