import type { MissionWorkItemStatus } from './mission-work-item-status.type';

/**
 * Input used to update a mission work item.
 */
export interface UpdateMissionWorkItemInput {
  readonly resultResource?: string | null;
  readonly assignee?: string | null;
  readonly status?: MissionWorkItemStatus;
  readonly skipReason?: string | null;
}
