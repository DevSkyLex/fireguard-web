import type { ChartColorToken } from '@shared/chart';
/**
 * Interface OrganizationDashboardAlertRow
 * @interface OrganizationDashboardAlertRow
 * @description Presentation-ready alert with a permission-checked collection destination.
 * @since 1.0.0
 */
export interface OrganizationDashboardAlertRow {
  /**
   * Property id
   * @readonly
   * @description Stable row identity.
   * @since 1.0.0
   * @type {string}
   */
  readonly id: string;
  /**
   * Property label
   * @readonly
   * @description Localized operational alert name.
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;
  /**
   * Property icon
   * @readonly
   * @description Registered semantic icon name.
   * @since 1.0.0
   * @type {string}
   */
  readonly icon: string;
  /**
   * Property count
   * @readonly
   * @description Current count; null represents unavailable data.
   * @since 1.0.0
   * @type {number | null}
   */
  readonly count: number | null;
  /**
   * Property colorToken
   * @readonly
   * @description Semantic color associated with the alert severity.
   * @since 1.0.0
   * @type {ChartColorToken}
   */
  readonly colorToken: ChartColorToken;
  /**
   * Property destination
   * @readonly
   * @description Supported collection route allowed by current permissions.
   * @since 1.0.0
   * @type {readonly string[] | null}
   */
  readonly destination: readonly string[] | null;
}
