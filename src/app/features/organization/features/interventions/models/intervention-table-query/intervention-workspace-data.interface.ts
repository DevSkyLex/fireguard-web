import type { InterventionChangeOutput } from '../intervention-change/intervention-change-output.interface';
import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';
import type { InterventionIssueOutput } from '../intervention/intervention-issue-output.interface';
import type { InterventionOutput } from '../intervention/intervention-output.interface';

/**
 * Interface InterventionWorkspaceData
 * @interface InterventionWorkspaceData
 *
 * @description
 * Complete workspace data, independent of persistence and query call states.
 *
 * @since 6.2.0
 */
export interface InterventionWorkspaceData {
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Contains the intervention currently loaded into the workspace.
   *
   * @access public
   *
   * @type {InterventionOutput}
   */
  readonly intervention: InterventionOutput;

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Contains the work items currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemOutput[]}
   */
  readonly workItems: readonly InterventionWorkItemOutput[];

  /**
   * Property changes
   * @readonly
   *
   * @description
   * Contains the proposed changes currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionChangeOutput[]}
   */
  readonly changes: readonly InterventionChangeOutput[];

  /**
   * Property issues
   * @readonly
   *
   * @description
   * Contains readiness issues currently reported for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionIssueOutput[]}
   */
  readonly issues: readonly InterventionIssueOutput[];
}
