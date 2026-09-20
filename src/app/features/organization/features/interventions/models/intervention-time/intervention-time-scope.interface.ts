/**
 * Interface InterventionTimeScope
 * @interface InterventionTimeScope
 *
 * @description
 * Scope captured before a journal request or write starts.
 *
 * @since 1.0.0
 */
export interface InterventionTimeScope {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Journal task.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workItemId: string;

  /**
   * Property actorId
   * @readonly
   *
   * @description
   * Current active organization member.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly actorId: string;
}
