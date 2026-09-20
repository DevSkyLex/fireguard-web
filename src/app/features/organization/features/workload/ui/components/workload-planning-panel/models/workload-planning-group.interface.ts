import type { UnallocatedWorkOutput } from '@features/organization/features/workload/models';
import type { WorkloadPlanningRow } from './workload-planning-row.interface';

/**
 * Interface WorkloadPlanningGroup
 * @interface WorkloadPlanningGroup
 *
 * @description
 * Server-classified work grouped by the next planning action, without allocating effort.
 *
 * @since 1.0.0
 */
export interface WorkloadPlanningGroup {
  /**
   * Property reason
   * @readonly
   *
   * @description
   * Server reason used as the disclosure identity.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {UnallocatedWorkOutput['reason']}
   */
  readonly reason: UnallocatedWorkOutput['reason'];

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short localized planning action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Decorative Lucide glyph reinforcing the visible planning action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Recovery explanation shown once for the entire group.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Intervention summaries retaining assignee and draft distinctions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly WorkloadPlanningRow[]}
   */
  readonly rows: readonly WorkloadPlanningRow[];

  /**
   * Property taskCount
   * @readonly
   *
   * @description
   * Distinct task count, not a global organization total.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly taskCount: number;
}
