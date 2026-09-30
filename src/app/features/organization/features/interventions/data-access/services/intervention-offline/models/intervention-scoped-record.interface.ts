/**
 * Interface InterventionScopedRecord
 * @interface
 *
 * @description
 * Optional intervention identifier used to scope a persisted offline record.
 */
export interface InterventionScopedRecord {
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
  readonly interventionId?: string;
}
