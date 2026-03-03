import type { InspectionResult, InspectorType } from './inspection-output.interface';

export interface CreateInspectionInput {
  readonly equipmentId: string;
  readonly result: InspectionResult;
  readonly performedAt: string;
  readonly inspectorType: InspectorType;
  readonly inspectorName: string;
  readonly facilityId?: string | null;
  readonly checklistId?: string | null;
  readonly inspectorUserId?: string | null;
  readonly inspectorOrganizationName?: string | null;
  readonly notes?: string | null;
  readonly signature?: string | null;
}
