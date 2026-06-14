import type { InterventionWorkItemStatus } from '../intervention-work-item/intervention-work-item-status.type';

/**
 * Work item status change requested from the execute workflow.
 */
export interface InterventionWorkItemStatusChange {
  readonly workItemId: string;
  readonly status: InterventionWorkItemStatus;
  readonly skipReason?: string;
}
