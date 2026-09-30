/**
 * Type InterventionAssignSubmittedEvent
 *
 * @description
 * What `InterventionAssignDialog` emits once a member is picked and
 * confirmed — the intervention being reassigned and the member now
 * responsible for it.
 *
 * @type
 */
export type InterventionAssignSubmittedEvent = {
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
   * Property responsible
   * @readonly
   *
   * @description
   * Identifies the member assigned responsibility for this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly responsible: string;
};
