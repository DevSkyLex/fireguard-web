import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionWorkItemAction } from '../intervention-work-item/intervention-work-item-action.type';

/**
 * Interface InterventionDiscoveryRequest
 * @interface InterventionDiscoveryRequest
 *
 * @description
 * Describes the input used to resolve an intervention work-item action into a discovery request.
 */
export interface InterventionDiscoveryRequest {
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
   * @type {string | null}
   */
  readonly target: string | null;

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
