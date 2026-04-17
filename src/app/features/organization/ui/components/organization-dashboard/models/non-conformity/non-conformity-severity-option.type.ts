import type { NonConformitySeverity } from '@features/organization/features/inspections/models';

/**
 * Type NonConformitySeverityOption
 *
 * @description
 * Select option used to expose non-conformity severity
 * filters in dashboard views.
 */
export type NonConformitySeverityOption = {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Display label of the non-conformity severity option, e.g. "Low",
   * "Medium", or "High".
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the non-conformity severity option,
   * corresponding to the NonConformitySeverity enum.
   *
   * @type {NonConformitySeverity}
   */
  readonly value: NonConformitySeverity;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Hex color code associated with the non-conformity severity,
   * used for consistent color-coding in the dashboard UI, e.g.
   * green for low severity, orange for medium severity, and red
   * for high severity.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
};