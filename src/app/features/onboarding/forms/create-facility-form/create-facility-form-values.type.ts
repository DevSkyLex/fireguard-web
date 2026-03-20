import type { FacilityType } from '@core/models/facility';

/**
 * Interface CreateFacilityFormValues
 *
 * @description
 * Shape emitted by the create-facility onboarding form on submit.
 *
 * @since 1.0.0
 */
export interface CreateFacilityFormValues {
  readonly type: FacilityType;
  readonly name: string;
  readonly address: string | null;
}
