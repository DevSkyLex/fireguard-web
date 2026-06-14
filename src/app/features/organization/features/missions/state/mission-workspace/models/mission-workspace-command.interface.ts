import type { MissionService } from '@features/organization/features/missions/data-access';
import type {
  CreateMissionWorkItemInput,
  MissionWorkItemStatusChange,
} from '@features/organization/features/missions/models';

export interface MissionDetailsUpdateCommand {
  readonly missionId: string;
  readonly input: Parameters<MissionService['update']>[1];
}

export interface MissionWorkItemCreateCommand {
  readonly missionId: string;
  readonly input: CreateMissionWorkItemInput;
}

export interface MissionWorkItemStatusCommand extends MissionWorkItemStatusChange {
  readonly missionId: string;
}
