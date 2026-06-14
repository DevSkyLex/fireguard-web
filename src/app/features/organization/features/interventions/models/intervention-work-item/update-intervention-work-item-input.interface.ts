import type { InterventionWorkItemStatus } from './intervention-work-item-status.type';

/**
 * Input used to update a intervention work item.
 */
export interface UpdateInterventionWorkItemInput {
  readonly resultResource?: string | null;
  readonly assignee?: string | null;
  readonly status?: InterventionWorkItemStatus;
  readonly skipReason?: string | null;
}
