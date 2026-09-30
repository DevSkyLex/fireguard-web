import type { CreateInterventionWorkItemInput } from '../intervention-work-item/create-intervention-work-item-input.interface';

/**
 * Interface InterventionDiscoveryResult
 * @interface InterventionDiscoveryResult
 *
 * @description
 * Returns the work-item details and any queued state produced by intervention discovery.
 */
export interface InterventionDiscoveryResult {
  /**
   * Property queued
   * @readonly
   *
   * @description
   * Indicates whether this discovery result was queued for later submission.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly queued: boolean;

  /**
   * Property workItem
   * @readonly
   *
   * @description
   * Contains the work item targeted by this operation, when one is available.
   *
   * @access public
   *
   * @type {CreateInterventionWorkItemInput}
   */
  readonly workItem: CreateInterventionWorkItemInput;
}
