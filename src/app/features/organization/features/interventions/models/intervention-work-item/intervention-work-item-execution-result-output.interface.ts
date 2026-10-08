import type { InterventionWorkItemExecutionResultInput } from './intervention-work-item-execution-result-input.interface';
import type { InterventionWorkItemExecutionResultState } from './intervention-work-item-execution-result-state.type';

/**
 * Interface InterventionWorkItemExecutionResultOutput
 * @interface InterventionWorkItemExecutionResultOutput
 *
 * @description
 * Recorded execution result and its publication provenance. Local projections omit authorId
 * until the server confirms the recording member.
 */
export interface InterventionWorkItemExecutionResultOutput extends InterventionWorkItemExecutionResultInput {
  /**
   * Property history
   * @readonly
   *
   * @description
   * Prior recorded attempts in chronological order, without recursively nested histories.
   *
   * @access public
   *
   * @type {readonly Omit<InterventionWorkItemExecutionResultOutput, 'history'>[] | undefined}
   */
  readonly history?: readonly Omit<InterventionWorkItemExecutionResultOutput, 'history'>[];

  /**
   * Property authorId
   * @readonly
   *
   * @description
   * Recording organization member identifier, absent before server acknowledgement.
   *
   * @access public
   *
   * @type {string | undefined}
   */
  readonly authorId?: string;

  /**
   * Property operationId
   * @readonly
   *
   * @description
   * Independent preventive operation, when this work fulfills one.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly operationId: string | null;

  /**
   * Property occurrenceId
   * @readonly
   *
   * @description
   * Identified preventive occurrence fulfilled by this execution.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly occurrenceId: string | null;

  /**
   * Property state
   * @readonly
   *
   * @description
   * Validation state of the result, independent of the work item's completion status.
   *
   * @access public
   *
   * @type {InterventionWorkItemExecutionResultState}
   */
  readonly state: InterventionWorkItemExecutionResultState;

  /**
   * Property validatedAt
   * @readonly
   *
   * @description
   * Publication validation instant, absent until validation succeeds.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly validatedAt: string | null;
}
