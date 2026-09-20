import type { WorkloadContributionOutput } from './workload-contribution-output.interface';

/**
 * Interface WorkloadDayOutput
 * @interface WorkloadDayOutput
 *
 * @description
 * Daily capacity and load computed by the API, never from a paged task list.
 *
 * @since 1.0.0
 */
export interface WorkloadDayOutput {
  /**
   * Property date
   * @readonly
   *
   * @description
   * Organization-local ISO date.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly date: string;

  /**
   * Property capacityMinutes
   * @readonly
   *
   * @description
   * Configured capacity; absence is unknown, not zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly capacityMinutes?: number | null;

  /**
   * Property actualMinutes
   * @readonly
   *
   * @description
   * Recorded non-cancelled work.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly actualMinutes: number;

  /**
   * Property remainingMinutes
   * @readonly
   *
   * @description
   * Committed remaining work allocated to this day.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly remainingMinutes: number;

  /**
   * Property draftMinutes
   * @readonly
   *
   * @description
   * Separate provisional work from drafts.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly draftMinutes: number;

  /**
   * Property overloadMinutes
   * @readonly
   *
   * @description
   * Daily excess; unknown when capacity is unavailable.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly overloadMinutes?: number | null;

  /**
   * Property utilizationPercent
   * @readonly
   *
   * @description
   * Uncapped ratio, absent for zero or unknown capacity.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly utilizationPercent?: number | null;

  /**
   * Property completeness
   * @readonly
   *
   * @description
   * Reliability of the projection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'complete' | 'partial' | 'unavailable'}
   */
  readonly completeness: 'complete' | 'partial' | 'unavailable';

  /**
   * Property availability
   * @readonly
   *
   * @description
   * Availability without assuming unknown effort is zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'available' | 'fully_allocated' | 'overloaded' | 'unavailable' | 'unknown'}
   */
  readonly availability: 'available' | 'fully_allocated' | 'overloaded' | 'unavailable' | 'unknown';

  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All contributions for the selected day.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly WorkloadContributionOutput[]}
   */
  readonly contributions: readonly WorkloadContributionOutput[];
}
