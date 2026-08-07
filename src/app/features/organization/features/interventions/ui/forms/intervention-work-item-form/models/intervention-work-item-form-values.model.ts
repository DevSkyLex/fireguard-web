import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/**
 * A task being added to the prepared scope.
 *
 * Only the action is required: a target and an assignee can be decided now or
 * left for field execution, which is what the backend accepts.
 */
export interface InterventionWorkItemFormValues {
  readonly action: InterventionWorkItemAction;
  readonly target: string;
  readonly assignee: string;
}
