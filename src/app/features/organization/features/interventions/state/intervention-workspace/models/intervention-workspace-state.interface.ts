import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * State of one intervention workspace.
 */
export interface InterventionWorkspaceState {
  readonly intervention: InterventionOutput | null;
  readonly workItems: readonly InterventionWorkItemOutput[];
  readonly changes: readonly InterventionChangeOutput[];
  readonly issues: readonly InterventionIssueOutput[];
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
}
