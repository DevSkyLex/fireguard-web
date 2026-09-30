/**
 * Interface InterventionResourceRecord
 * @interface
 *
 * @description
 * IndexedDB row that stores an intervention resource in the offline workspace.
 */
export interface InterventionResourceRecord {
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
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the intervention resource record variant represented by this value.
   *
   * @access public
   *
   * @type {string}
   */
  readonly kind: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value submitted when this intervention resource record is selected.
   *
   * @access public
   *
   * @type {unknown}
   */
  readonly value: unknown;
}
