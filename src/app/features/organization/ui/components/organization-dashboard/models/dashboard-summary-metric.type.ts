import type { MetricComparison } from '@shared/components';

/**
 * Type DashboardSummaryMetric
 *
 * @description
 * View model rendered by dashboard summary tiles. Stores the displayed label,
 * formatted value, optional icon, and optional comparison delta.
 */
export type DashboardSummaryMetric = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the metric, e.g. "Total Inspections".
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Formatted value of the metric, e.g. "1,234" or "95.6%".
   * This is the main value displayed in the dashboard tile.
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Optional icon name to be displayed alongside the metric value, e.g. "check_circle" or "warning".
   * This is used to provide a quick visual indication of the metric's status.
   *
   * @type {string | null
   */
  readonly icon: string | null;

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Optional comparison payload indicating the change from a
   * previous period, including the delta value and direction.
   * This is used to show trends, such as an increase or
   * decrease compared to the last month.
   *
   * @type {MetricComparison | null}
   */
  readonly comparison: MetricComparison | null;
  //#endregion
};
