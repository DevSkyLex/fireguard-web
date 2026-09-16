import type { InterventionChangeOutput } from '../intervention-change/intervention-change-output.interface';
import type { InterventionWorkItemOutput } from '../intervention-work-item/intervention-work-item-output.interface';
import type { InterventionIssueOutput } from '../intervention/intervention-issue-output.interface';
import type { InterventionOutput } from '../intervention/intervention-output.interface';

/**
 * Interface InterventionWorkspaceData
 * @interface InterventionWorkspaceData
 * @description Complete workspace data, independent of persistence and query call states.
 * @since 6.2.0
 */
export interface InterventionWorkspaceData {
  readonly intervention: InterventionOutput;
  readonly workItems: readonly InterventionWorkItemOutput[];
  readonly changes: readonly InterventionChangeOutput[];
  readonly issues: readonly InterventionIssueOutput[];
}
