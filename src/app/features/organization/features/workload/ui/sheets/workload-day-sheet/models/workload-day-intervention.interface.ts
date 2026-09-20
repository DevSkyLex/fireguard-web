/**
 * Interface WorkloadDayIntervention
 * @interface WorkloadDayIntervention
 *
 * @description
 * Display-only grouping of the API's daily contributions; drafts remain outside committed totals.
 *
 * @since 1.0.0
 */
export interface WorkloadDayIntervention {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Intervention identity, falling back to a task identity when no intervention is supplied.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Optional detail destination.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly interventionId: string | null;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Server label or task identifier when no readable label is supplied.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property actualMinutes
   * @readonly
   *
   * @description
   * Sum of recorded entries, or null when this group has no recorded contribution.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly actualMinutes: number | null;

  /**
   * Property remainingMinutes
   * @readonly
   *
   * @description
   * Committed effort already allocated by the API, or null when absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly remainingMinutes: number | null;

  /**
   * Property draftMinutes
   * @readonly
   *
   * @description
   * Provisional effort excluded from the daily total, or null when absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly draftMinutes: number | null;
}
