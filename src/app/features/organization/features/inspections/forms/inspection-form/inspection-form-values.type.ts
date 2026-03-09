import type { InspectionResult, InspectorType } from '@core/models/inspection';

/**
 * Type InspectionFormValues
 *
 * @description
 * Shape emitted by the inspection form on submit.
 * Maps to {@link CreateInspectionInput} for creation.
 *
 * @since 1.0.0
 */
export interface InspectionFormValues {
  readonly equipmentId: string;
  readonly result: InspectionResult;
  readonly performedAt: string;
  readonly inspectorType: InspectorType;
  readonly inspectorName: string;
  readonly facilityId: string;
  readonly checklistId: string;
  readonly notes: string;
  readonly signature: string;
}
