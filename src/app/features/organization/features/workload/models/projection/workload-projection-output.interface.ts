import type { MemberWorkloadOutput } from './member-workload-output.interface';
import type { UnallocatedWorkOutput } from './unallocated-work-output.interface';

/**
 * Interface WorkloadProjectionOutput
 * @interface WorkloadProjectionOutput
 *
 * @description
 * Organization-scoped workload for an inclusive local-date period.
 *
 * @since 1.0.0
 */
export interface WorkloadProjectionOutput {
  /**
   * Property startsOn
   * @readonly
   *
   * @description
   * Inclusive requested start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly startsOn: string;

  /**
   * Property endsOn
   * @readonly
   *
   * @description
   * Inclusive requested end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly endsOn: string;

  /**
   * Property today
   * @readonly
   *
   * @description
   * Today in the organization timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly today: string;

  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Authoritative IANA timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly timezone: string;

  /**
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * Organization week boundary.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'monday' | 'sunday'}
   */
  readonly firstDayOfWeek: 'monday' | 'sunday';

  /**
   * Property calculatedAt
   * @readonly
   *
   * @description
   * Calculation timestamp.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly calculatedAt: string;

  /**
   * Property members
   * @readonly
   *
   * @description
   * Unique members matching the server filters.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly MemberWorkloadOutput[]}
   */
  readonly members: readonly MemberWorkloadOutput[];

  /**
   * Property unassigned
   * @readonly
   *
   * @description
   * Organization work still to assign.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly UnallocatedWorkOutput[]}
   */
  readonly unassigned: readonly UnallocatedWorkOutput[];

  /**
   * Property completeness
   * @readonly
   *
   * @description
   * Overall reliability, not a claim of availability.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'complete' | 'partial' | 'unavailable'}
   */
  readonly completeness: 'complete' | 'partial' | 'unavailable';
}
