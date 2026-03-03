import type { HydraItem } from '@core/models/api';

export type InspectionResult = 'pass' | 'fail' | 'partial';

export type InspectionStatus = 'draft' | 'submitted' | 'closed';

export type InspectorType = 'user' | 'external';

export interface InspectionOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly equipmentId: string;
  readonly facilityId: string | null;
  readonly result: InspectionResult;
  readonly status: InspectionStatus;
  readonly performedAt: string;
  readonly inspectorType: InspectorType;
  readonly inspectorName: string;
  readonly inspectorUserId: string | null;
  readonly inspectorOrganizationName: string | null;
  readonly checklistId: string | null;
  readonly notes: string | null;
  readonly signature: string | null;
  readonly nonConformitiesCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
