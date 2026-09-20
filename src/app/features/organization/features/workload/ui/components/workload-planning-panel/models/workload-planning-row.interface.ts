import type { UnallocatedWorkOutput } from '@features/organization/features/workload/models';

/**
 * Interface WorkloadPlanningRow
 * @interface WorkloadPlanningRow
 *
 * @description
 * Intervention summary for one assignee and commitment, within a single planning reason.
 *
 * @since 1.0.0
 */
export interface WorkloadPlanningRow extends Pick<
  UnallocatedWorkOutput,
  'interventionId' | 'label'
> {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable intervention, assignee and commitment identity.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Assignee identifier, absent for work to assign.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly memberId: string | null;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Projected member name when directory metadata is unavailable.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property taskCount
   * @readonly
   *
   * @description
   * Number of distinct tasks represented by this intervention row.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly taskCount: number;

  /**
   * Property remainingMinutes
   * @readonly
   *
   * @description
   * Combined effort only when every represented task has an estimate; null is not zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null}
   */
  readonly remainingMinutes: number | null;

  /**
   * Property isDraft
   * @readonly
   *
   * @description
   * Distinguishes provisional demand from committed work without combining their totals.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly isDraft: boolean;

  /**
   * Property capacityMemberId
   * @readonly
   *
   * @description
   * Authorized configuration target for a missing-capacity issue, otherwise null.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly capacityMemberId: string | null;
}
