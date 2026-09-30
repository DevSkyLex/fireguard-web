import type {
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkItemOptimisticResult
 * @interface InterventionWorkItemOptimisticResult
 *
 * @description
 * Returns the optimistic intervention projection together with its newly created work item.
 */
export interface InterventionWorkItemOptimisticResult {
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Updated intervention projection, or null when the intervention is unavailable.
   *
   * @access public
   *
   * @type {InterventionOutput | null}
   */
  readonly intervention: InterventionOutput | null;

  /**
   * Property workItem
   * @readonly
   *
   * @description
   * Work item produced by the optimistic create operation.
   *
   * @access public
   *
   * @type {InterventionWorkItemOutput}
   */
  readonly workItem: InterventionWorkItemOutput;
}
