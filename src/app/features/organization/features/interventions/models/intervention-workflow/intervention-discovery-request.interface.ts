import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionWorkItemAction } from '../intervention-work-item/intervention-work-item-action.type';

/**
 * Field discovery requested from the execute workflow.
 */
export interface InterventionDiscoveryRequest {
  readonly action: InterventionWorkItemAction;
  readonly target: string | null;
  readonly result: InspectionResult;
}
