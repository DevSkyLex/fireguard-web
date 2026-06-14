import type {
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';

/**
 * Normalized mission workspace persisted for offline use.
 */
export interface MissionWorkspaceSnapshot {
  readonly mission: MissionOutput;
  readonly workItems: readonly MissionWorkItemOutput[];
  readonly changes: readonly MissionChangeOutput[];
  readonly issues: readonly MissionIssueOutput[];
}
