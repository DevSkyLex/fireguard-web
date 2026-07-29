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
  /**
   * Lifecycle of the workspace fetch that seeds this state.
   */
  readonly loadCallState: CallState;

  /**
   * Lifecycle shared by every write this workspace performs — transitions,
   * planning details, work items, comments, deletion.
   *
   * One field rather than one per command: the workspace surfaces a single busy
   * state, and its drawers are modal, so two writes never race for the user's
   * attention. What matters is that a failure now keeps the normalized
   * `StoreError` — the previous `saving: boolean` + pre-localized `error: string`
   * pair threw the payload away, so an HTTP 422 could never reach the form that
   * caused it.
   */
  readonly mutationCallState: CallState;

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
