import type { OrganizationDashboardGranularity } from '@features/organization/models';

/**
 * Type GranularityOption
 *
 * @description
 * Localized label and API granularity value used by the dashboard selector.
 *
 * @since 0.1.0
 *
 * @type GranularityOption
 */
export type GranularityOption = {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Text presented for the corresponding trend interval.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Granularity sent with dashboard trend requests when selected.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {OrganizationDashboardGranularity}
   */
  readonly value: OrganizationDashboardGranularity;
};
