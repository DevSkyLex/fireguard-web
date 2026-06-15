import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';

/** Values emitted when recording a field discovery. */
export interface InterventionDiscoveryFormValues {
  readonly action: InterventionWorkItemAction;
  readonly target: string;
  readonly result: InspectionResult;
}
