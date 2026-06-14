import type { MissionWorkItemAction } from './mission-work-item-action.type';
import type { MissionWorkItemSource } from './mission-work-item-source.type';

/**
 * Input used to create a mission work item.
 */
export interface CreateMissionWorkItemInput {
  readonly clientId?: string;
  readonly mission: string;
  readonly action: MissionWorkItemAction;
  readonly target?: string | null;
  readonly resultResource?: string | null;
  readonly assignee?: string | null;
  readonly source: MissionWorkItemSource;
  readonly required: boolean;
}
