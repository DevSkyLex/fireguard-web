import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { MissionWorkItemAction } from '../mission-work-item/mission-work-item-action.type';

/**
 * Field discovery requested from the execute workflow.
 */
export interface MissionDiscoveryRequest {
  readonly action: MissionWorkItemAction;
  readonly target: string | null;
  readonly result: InspectionResult;
}
