/**
 * Interface InterventionTimeEntryVersion
 * @interface InterventionTimeEntryVersion
 *
 * @description
 * One immutable version of a time entry.
 *
 * @since 1.0.0
 */
export interface InterventionTimeEntryVersion {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Journal revision.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property workedOn
   * @readonly
   *
   * @description
   * Organization-local work date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly workedOn: string;

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Recorded duration.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly minutes: number;

  /**
   * Property note
   * @readonly
   *
   * @description
   * Optional explanation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly note?: string | null;

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Whether this version cancels the entry.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly cancelled: boolean;

  /**
   * Property actorId
   * @readonly
   *
   * @description
   * Member who authored this version.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly actorId: string;

  /**
   * Property recordedAt
   * @readonly
   *
   * @description
   * Audit timestamp.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly recordedAt: string;
}
