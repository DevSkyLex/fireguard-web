/**
 * Interface InterventionTableRequest
 * @interface InterventionTableRequest
 *
 * @description
 * Context- and generation-bound execution command; delay applies only to text edits.
 *
 * @since 6.2.0
 */
export interface InterventionTableRequest<TCriteria> {
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
   * Property criteria
   * @readonly
   *
   * @description
   * Carries the typed filters applied to this table request.
   *
   * @access public
   *
   * @type {TCriteria}
   */
  readonly criteria: TCriteria;

  /**
   * Property generation
   * @readonly
   *
   * @description
   * Fences a late response from replacing a newer request generation.
   *
   * @access public
   *
   * @type {number}
   */
  readonly generation: number;

  /**
   * Property delay
   * @readonly
   *
   * @description
   * Sets the debounce interval before this request is issued.
   *
   * @access public
   *
   * @type {number}
   */
  readonly delay: number;
}
