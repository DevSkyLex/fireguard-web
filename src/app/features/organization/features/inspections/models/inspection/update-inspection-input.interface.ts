import type { InspectionResult } from './inspection-output.interface';

/**
 * Partial payload accepted when editing a draft inspection.
 */
export interface UpdateInspectionInput {
  readonly equipmentId?: string;
  readonly facilityId?: string | null;
  readonly checklistId?: string | null;
  readonly result?: InspectionResult;
  readonly performedAt?: string;
  readonly notes?: string | null;
  readonly signature?: string | null;
}
