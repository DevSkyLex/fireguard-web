/**
 * Interface CreateInterventionChangeInput
 * @interface
 *
 * @description
 * Input used to create a proposed intervention change.
 */
export interface CreateInterventionChangeInput {
  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Identifies the client-created message used to correlate this send with its result.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientId?: string;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Contains the intervention currently loaded into the workspace.
   *
   * @access public
   *
   * @type {string}
   */
  readonly intervention: string;

  /**
   * Property workItem
   * @readonly
   *
   * @description
   * Contains the work item targeted by this operation, when one is available.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly workItem?: string | null;

  /**
   * Property resource
   * @readonly
   *
   * @description
   * Identifies the linked resource associated with this intervention item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property patch
   * @readonly
   *
   * @description
   * Contains the fields changed by this update.
   *
   * @access public
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  readonly patch: Readonly<Record<string, unknown>>;
}
