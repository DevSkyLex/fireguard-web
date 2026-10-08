import type { HydraItem } from '@core/api/models';
import type { NonConformitySeverity } from '@features/organization/features/inspections/models';

/**
 * Interface ParkAnomaliesSummaryOutput
 * @interface
 *
 * @description
 * Server projection of unresolved anomalies in the same park scope as the equipment counts.
 *
 * @since unreleased
 */
export interface ParkAnomaliesSummaryOutput extends HydraItem {
  /**
   * Property openAnomalies
   * @readonly
   *
   * @description
   * Open or in-progress findings across the complete selected scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly openAnomalies: number;
  /**
   * Property bySeverity
   * @readonly
   *
   * @description
   * Explicit counts by severity, including zero values.
   *
   * @access public
   * @since unreleased
   *
   * @type {Readonly<Record<NonConformitySeverity, number>>}
   */
  readonly bySeverity: Readonly<Record<NonConformitySeverity, number>>;
}
