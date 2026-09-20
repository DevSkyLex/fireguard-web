import type { UnallocatedWorkOutput } from './unallocated-work-output.interface';
import type { WorkloadDayOutput } from './workload-day-output.interface';

/**
 * Interface MemberWorkloadOutput
 * @interface MemberWorkloadOutput
 *
 * @description
 * One organization member and all of their work, independent of team filtering.
 *
 * @since 1.0.0
 */
export interface MemberWorkloadOutput {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Organization membership identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Identity supplied by the organization directory.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly displayName?: string | null;

  /**
   * Property days
   * @readonly
   *
   * @description
   * Chronological daily totals.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly WorkloadDayOutput[]}
   */
  readonly days: readonly WorkloadDayOutput[];

  /**
   * Property unallocated
   * @readonly
   *
   * @description
   * Work requiring estimation or replanning.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly UnallocatedWorkOutput[]}
   */
  readonly unallocated: readonly UnallocatedWorkOutput[];
}
