import type { InterventionWorkItemAction } from './intervention-work-item-action.type';
import type { InterventionWorkItemSource } from './intervention-work-item-source.type';

/**
 * Input used to create a intervention work item.
 */
export interface CreateInterventionWorkItemInput {
  readonly clientId?: string;
  readonly intervention: string;
  readonly action: InterventionWorkItemAction;
  readonly target?: string | null;
  readonly resultResource?: string | null;
  readonly assignee?: string | null;
  readonly source: InterventionWorkItemSource;
  readonly required: boolean;
}
