import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/**
 * Canonical resource discovered while executing an intervention.
 */
export interface InterventionFieldDiscovery {
  readonly action: InterventionWorkItemAction;
  readonly target: string;
  readonly result: InspectionResult;
}
