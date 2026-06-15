import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/** Values emitted when adding a prepared work item. */
export interface InterventionWorkItemFormValues {
  readonly action: InterventionWorkItemAction;
  readonly target: string;
  readonly assignee: string;
}
