import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionFieldDiscovery
 * @interface InterventionFieldDiscovery
 *
 * @description
 * Describes the result of resolving an intervention work-item action in the field.
 */
export interface InterventionFieldDiscovery {
  /**
   * Property action
   * @readonly
   *
   * @description
   * Selects the action represented by this work-item form.
   *
   * @access public
   *
   * @type {InterventionWorkItemAction}
   */
  readonly action: InterventionWorkItemAction;

  /**
   * Property target
   * @readonly
   *
   * @description
   * Identifies the selected target for this work item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly target: string;

  /**
   * Property result
   * @readonly
   *
   * @description
   * Reports the outcome assigned to this inspection.
   *
   * @access public
   *
   * @type {InspectionResult}
   */
  readonly result: InspectionResult;
}
