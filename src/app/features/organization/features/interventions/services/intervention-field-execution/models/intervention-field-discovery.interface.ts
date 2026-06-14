import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { MissionWorkItemAction } from '@features/organization/features/missions/models';

/**
 * Canonical resource discovered while executing a mission.
 */
export interface MissionFieldDiscovery {
  readonly action: MissionWorkItemAction;
  readonly target: string;
  readonly result: InspectionResult;
}
