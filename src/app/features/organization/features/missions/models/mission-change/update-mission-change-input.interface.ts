import type { MissionChangeStatus } from './mission-change-status.type';

/**
 * Input used to update a proposed mission change.
 */
export interface UpdateMissionChangeInput {
  readonly patch?: Readonly<Record<string, unknown>>;
  readonly status?: Extract<MissionChangeStatus, 'proposed' | 'rejected'>;
}
