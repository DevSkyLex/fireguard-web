/**
 * Interface WorkloadContributionOutput
 * @interface WorkloadContributionOutput
 *
 * @description
 * A quantified share of a task or time entry on a local day.
 *
 * @since 1.0.0
 */
export interface WorkloadContributionOutput {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Owning intervention for a contextual detail link.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly interventionId?: string | null;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable intervention name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly label?: string | null;

  /**
   * Property taskId
   * @readonly
   *
   * @description
   * Owning intervention task.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly taskId: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Realized, committed or provisional work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'actual' | 'committed' | 'draft'}
   */
  readonly kind: 'actual' | 'committed' | 'draft';

  /**
   * Property minutes
   * @readonly
   *
   * @description
   * Integral minutes on this day.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly minutes: number;

  /**
   * Property entryId
   * @readonly
   *
   * @description
   * Time entry for realized work, otherwise absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly entryId?: string | null;
}
