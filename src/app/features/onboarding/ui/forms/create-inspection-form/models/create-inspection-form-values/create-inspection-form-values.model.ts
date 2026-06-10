import type { SetupInspectionResult, SetupInspectorType } from '@features/organization/setup';

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
  readonly result: SetupInspectionResult;
  readonly performedAt: string;
  readonly inspectorType: SetupInspectorType;
  readonly inspectorName: string;
}
