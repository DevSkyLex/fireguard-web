/**
 * Interface UnallocatedWorkOutput
 * @interface UnallocatedWorkOutput
 *
 * @description
 * Visible work that cannot be allocated reliably.
 *
 * @since 1.0.0
 */
export interface UnallocatedWorkOutput {
  /**
   * Property taskId
   * @readonly
   *
   * @description
   * Owning task identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly taskId: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Intervention detail destination.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Readable intervention label.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Assignee, absent for unassigned work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly memberId?: string | null;

  /**
   * Property remainingMinutes
   * @readonly
   *
   * @description
   * Remaining effort; absence means unestimated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly remainingMinutes?: number | null;

  /**
   * Property startsOn
   * @readonly
   *
   * @description
   * Effective period start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly startsOn?: string | null;

  /**
   * Property endsOn
   * @readonly
   *
   * @description
   * Effective period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly endsOn?: string | null;

  /**
   * Property commitment
   * @readonly
   *
   * @description
   * Whether this work is already engaged.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'committed' | 'draft'}
   */
  readonly commitment: 'committed' | 'draft';

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Why this work is not in the daily totals.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'unassigned' | 'unestimated' | 'undated' | 'overdue' | 'unknown_capacity' | 'no_available_day'}
   */
  readonly reason:
    | 'unassigned'
    | 'unestimated'
    | 'undated'
    | 'overdue'
    | 'unknown_capacity'
    | 'no_available_day';
}
