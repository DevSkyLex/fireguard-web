import type { InterventionWorkItemExecutionOutcome } from './intervention-work-item-execution-outcome.type';

/**
 * Interface InterventionWorkItemExecutionResultInput
 * @interface InterventionWorkItemExecutionResultInput
 *
 * @description
 * Captures work actually performed, independently of synchronization and publication dates.
 */
export interface InterventionWorkItemExecutionResultInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * UUID of the equipment on which the work was performed.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property performedAt
   * @readonly
   *
   * @description
   * Operator-declared execution instant with its explicit timezone offset.
   *
   * @access public
   *
   * @type {string}
   */
  readonly performedAt: string;

  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Actual execution outcome, including failed work that still needs attention.
   *
   * @access public
   *
   * @type {InterventionWorkItemExecutionOutcome}
   */
  readonly outcome: InterventionWorkItemExecutionOutcome;

  /**
   * Property workPerformed
   * @readonly
   *
   * @description
   * Operator's description of the work actually executed.
   *
   * @access public
   *
   * @type {string}
   */
  readonly workPerformed: string;
}
