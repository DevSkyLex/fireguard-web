import type { HydraItem } from '@core/api/models';
import type { MaintenanceCostFrozen } from './maintenance-cost-frozen.interface';
import type { MaintenanceCostProjection } from './maintenance-cost-projection.interface';
import type { MaintenanceEstimatedResource } from './maintenance-estimated-resource.interface';

/**
 * Interface MaintenanceCostOutput
 * @interface MaintenanceCostOutput
 *
 * @description
 * A dedicated private dossier separates current costs from its fixed closure snapshot.
 */
export interface MaintenanceCostOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Intervention identity used by the cost resource.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Organization currency.
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
   * Explicit exact forecast, or unknown.
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
   * Explicit integral effort estimate, or unknown.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly estimatedMinutes?: number | null;

  /**
   * Property planningRevision
   * @readonly
   *
   * @description
   * Independently versioned forecast; zero before its first save.
   *
   * @access public
   *
   * @type {number}
   */
  readonly planningRevision: number;

  /**
   * Property planningEditable
   * @readonly
   *
   * @description
   * Server capability for forecast edits.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly planningEditable: boolean;

  /**
   * Property resources
   * @readonly
   *
   * @description
   * Current estimated resources.
   *
   * @access public
   *
   * @type {readonly MaintenanceEstimatedResource[]}
   */
  readonly resources: readonly MaintenanceEstimatedResource[];

  /**
   * Property current
   * @readonly
   *
   * @description
   * Current realized operational costs.
   *
   * @access public
   *
   * @type {MaintenanceCostProjection}
   */
  readonly current: MaintenanceCostProjection;

  /**
   * Property frozen
   * @readonly
   *
   * @description
   * Private closure snapshot, if the intervention was published.
   *
   * @access public
   *
   * @type {MaintenanceCostFrozen | null}
   */
  readonly frozen?: MaintenanceCostFrozen | null;
}
