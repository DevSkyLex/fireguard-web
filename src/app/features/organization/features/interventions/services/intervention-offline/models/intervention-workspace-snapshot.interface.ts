import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * Normalized intervention workspace persisted for offline use.
 */
export interface InterventionWorkspaceSnapshot {
  readonly intervention: InterventionOutput;
  readonly workItems: readonly InterventionWorkItemOutput[];
  readonly changes: readonly InterventionChangeOutput[];
  readonly issues: readonly InterventionIssueOutput[];
}
