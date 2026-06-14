import type {
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';

/**
 * State of one mission workspace.
 */
export interface MissionWorkspaceState {
  readonly mission: MissionOutput | null;
  readonly workItems: readonly MissionWorkItemOutput[];
  readonly changes: readonly MissionChangeOutput[];
  readonly issues: readonly MissionIssueOutput[];
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
}
