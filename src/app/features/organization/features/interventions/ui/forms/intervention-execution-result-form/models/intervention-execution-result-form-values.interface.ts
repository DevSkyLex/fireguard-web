/**
 * Interface InterventionExecutionResultFormValues
 * @interface InterventionExecutionResultFormValues
 *
 * @description
 * Operator-entered date and work details before conversion to the API result.
 */
export interface InterventionExecutionResultFormValues {
  /**
   * Property performedAt
   * @readonly
   *
   * @description
   * Local date and time in the organization's timezone.
   *
   * @type {string}
   */
  readonly performedAt: string;

  /**
   * Property outcome
   * @readonly
   *
   * @description
   * Explicit result selected by the operator.
   *
   * @type {string}
   */
  readonly outcome: string;

  /**
   * Property workPerformed
   * @readonly
   *
   * @description
   * Actual work performed, independent of planned instructions.
   *
   * @type {string}
   */
  readonly workPerformed: string;
}
