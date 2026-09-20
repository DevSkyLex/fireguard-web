import type { MemberWorkloadOutput } from './member-workload-output.interface';
import type { WorkloadDayOutput } from './workload-day-output.interface';

/**
 * Interface WorkloadDaySelection
 * @interface WorkloadDaySelection
 *
 * @description
 * One selected member/day from a server projection.
 *
 * @since 1.0.0
 */
export interface WorkloadDaySelection {
  /**
   * Property member
   * @readonly
   *
   * @description
   * Selected member, including unallocated tasks.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {MemberWorkloadOutput}
   */
  readonly member: MemberWorkloadOutput;

  /**
   * Property day
   * @readonly
   *
   * @description
   * Selected daily contributions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WorkloadDayOutput}
   */
  readonly day: WorkloadDayOutput;
}
