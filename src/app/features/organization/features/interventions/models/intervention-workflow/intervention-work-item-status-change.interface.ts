import type { MissionWorkItemStatus } from '../mission-work-item/mission-work-item-status.type';

/**
 * Work item status change requested from the execute workflow.
 */
export interface MissionWorkItemStatusChange {
  readonly workItemId: string;
  readonly status: MissionWorkItemStatus;
  readonly skipReason?: string;
}
