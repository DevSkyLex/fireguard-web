import type { CallState } from '@core/request-state';
import type {
  InterventionActivityOutput,
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

  /**
   * Activity timeline (comments and system entries) of the active
   * intervention, ordered `createdAt` ascending.
   */
  readonly activities: readonly InterventionActivityOutput[];

  /**
   * Loading / success / error state for `loadActivities`, kept separate from
   * {@link loading} so the activity tab can show its own skeleton without
   * being tied to the main workspace fetch.
   */
  readonly activityCallState: CallState;
}
