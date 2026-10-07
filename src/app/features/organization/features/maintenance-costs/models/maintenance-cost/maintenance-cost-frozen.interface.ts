import type { MaintenanceCostProjection } from './maintenance-cost-projection.interface';
import type { MaintenanceEstimatedResource } from './maintenance-estimated-resource.interface';

/**
 * Interface MaintenanceCostFrozen
 * @interface MaintenanceCostFrozen
 *
 * @description
 * The private closure snapshot remains unchanged by later operational corrections.
 */
export interface MaintenanceCostFrozen extends MaintenanceCostProjection {
  /**
   * Property version
   * @readonly
   *
   * @description
   * Snapshot schema version.
   *
   * @access public
   *
   * @type {1}
   */
  readonly version: 1;

  /**
   * Property capturedAt
   * @readonly
   *
   * @description
   * Closure capture timestamp.
   *
   * @access public
   *
   * @type {string}
   */
  readonly capturedAt: string;

  /**
   * Property publicationId
   * @readonly
   *
   * @description
   * Owning atomic publication identifier.
   *
   * @access public
   *
   * @type {string}
   */
  readonly publicationId: string;

  /**
   * Property interventionRevision
   * @readonly
   *
   * @description
   * Operational revision validated at publication.
   *
   * @access public
   *
   * @type {number}
   */
  readonly interventionRevision: number;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Currency retained at closure.
   *
   * @access public
   *
   * @type {string}
   */
  readonly currency: string;

  /**
   * Property plannedBudget
   * @readonly
   *
   * @description
   * Forecast retained at closure.
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
   * Estimated integral minutes retained at closure.
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
   * Forecast resources retained at closure.
   *
   * @access public
   *
   * @type {readonly MaintenanceEstimatedResource[]}
   */
  readonly resources: readonly MaintenanceEstimatedResource[];
}
