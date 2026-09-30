/**
 * Interface InterventionRequestChangesFormValues
 * @interface
 *
 * @description
 * The note is what the field agent reads when the work returns to execution,
 * which is why the backend requires it rather than accepting a bare rejection.
 */
export interface InterventionRequestChangesFormValues {
  /**
   * Property note
   * @readonly
   *
   * @description
   * Carries the optional note submitted with this decision.
   *
   * @access public
   *
   * @type {string}
   */
  readonly note: string;
}
