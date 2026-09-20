/**
 * Interface InterventionTimeDraft
 * @interface InterventionTimeDraft
 *
 * @description
 * Unsaved, account-bound time input. Text duration preserves partial edits.
 *
 * @since 1.0.0
 */
export interface InterventionTimeDraft {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable client identifier reused on submit and replay.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Member who performed the work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property workedOn
   * @readonly
   *
   * @description
   * Local work date, possibly blank while editing.
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
   * Duration input, possibly incomplete.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly minutes: string;

  /**
   * Property note
   * @readonly
   *
   * @description
   * Optional note being edited.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly note: string;

  /**
   * Property baseRevision
   * @readonly
   *
   * @description
   * Server revision for a correction; null for creation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly baseRevision: number | null;
}
