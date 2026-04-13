import type {
  InspectionResult,
  InspectorType,
} from '@features/organization/features/inspections/models';

/**
 * Interface CreateInspectionFormValues
 *
 * @description
 * Shape emitted by the create-inspection onboarding form on submit.
 *
 * @since 1.0.0
 */
export interface CreateInspectionFormValues {
  readonly equipmentId: string;
  readonly result: InspectionResult;
  readonly performedAt: string;
  readonly inspectorType: InspectorType;
  readonly inspectorName: string;
}
