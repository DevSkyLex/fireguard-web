/**
 * Type DashboardSingleTrendViewModel
 *
 * @description
 * Normalized frontend-friendly representation for a dashboard card backed by
 * a single trend endpoint and an optional previous-period comparison.
 */
export type DashboardSingleTrendViewModel = {
  /**
   * Property labels
   * @readonly
   *
   * @description
   * Placeholder labels matching the
   * current series length.
   *
   * @type {string[]}
   */
  readonly labels: string[];
  /**
   * Property currentValues
   * @readonly
   *
   * @description
   * Current-period numeric values in
   * display order.
   *
   * @type {number[]}
   */
  readonly currentValues: number[];
  /**
   * Property comparisonValues
   * @readonly
   *
   * @description
   * Previous-period numeric values in display order.
   *
   * @type {number[]}
   */
  readonly comparisonValues: number[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Sum of the current-period values.
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property previousTotal
   * @readonly
   *
   * @description
   * Sum of the previous-period values.
   *
   * @type {number}
   */
  readonly previousTotal: number;

  /**
   * Property compareEnabled
   * @readonly
   *
   * @description
   * Whether comparison mode is
   * currently enabled.
   *
   * @type {boolean}
   */
  readonly compareEnabled: boolean;

  /**
   * Property hasComparisonData
   * @readonly
   *
   * @description
   * Whether a comparison series is available
   * for chart rendering.
   *
   * @type {boolean}
   */
  readonly hasComparisonData: boolean;
};