/**
 * Type InterventionAssignRequest
 *
 * @description
 * intervention being reassigned and its current responsible, or `null` to
 * keep the dialog closed. Owned by the caller, the same shape
 * `InterventionConfirmRequest` uses for its own text confirmations.
 *
 * @type
 */
export type InterventionAssignRequest = {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property interventionName
   * @readonly
   *
   * @description
   * Provides the display name of the linked intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionName: string;

  /**
   * Property currentResponsible
   * @readonly
   *
   * @description
   * Identifies the person currently responsible for this intervention.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly currentResponsible: string | null;
};
