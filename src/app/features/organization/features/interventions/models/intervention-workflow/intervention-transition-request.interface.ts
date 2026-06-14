import type { MissionStatus } from '../mission/mission-status.type';

/**
 * Mission status transition requested by the workspace.
 */
export interface MissionTransitionRequest {
  readonly missionId: string;
  readonly status: MissionStatus;
  readonly reviewNote?: string;
}
