import type { MissionOutput } from '@features/organization/features/missions/models';

/**
 * State of the field agent mission list.
 */
export interface MyMissionsState {
  readonly missions: readonly MissionOutput[];
  readonly loading: boolean;
}
