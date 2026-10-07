import type { MaintenanceEstimatedResource } from './maintenance-estimated-resource.interface';

/**
 * Interface WriteMaintenanceCostPlanningInput
 * @interface WriteMaintenanceCostPlanningInput
 *
 * @description
 * Only explicitly submitted forecast fields change, including an explicit unknown value.
 */
export interface WriteMaintenanceCostPlanningInput {
  /**
   * Property plannedBudget
   * @readonly
   *
   * @description
   * Exact nonnegative budget or explicit unknown.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly plannedBudget?: string | null;

  /**
   * Property estimatedMinutes
   * @readonly
   *
   * @description
   * Integral estimated minutes or explicit unknown.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly estimatedMinutes?: number | null;

  /**
   * Property resources
   * @readonly
   *
   * @description
   * Explicit replacement forecast resources.
   *
   * @access public
   *
   * @type {readonly MaintenanceEstimatedResource[]}
   */
  readonly resources?: readonly MaintenanceEstimatedResource[];
}
