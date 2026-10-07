/**
 * Interface InterventionReplacementContextRequest
 * @interface InterventionReplacementContextRequest
 *
 * @description
 * Identifies the captured task and original equipment whose published successor is required.
 */
export interface InterventionReplacementContextRequest {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization whose equipment and work-item context own the replacement query.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Canonical original equipment UUID captured before loading replacement facts.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Work item to which the verified replacement result will be attached.
   *
   * @access public
   *
   * @type {string}
   */
  readonly workItemId: string;
}
