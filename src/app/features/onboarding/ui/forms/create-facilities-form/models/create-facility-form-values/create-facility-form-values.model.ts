import type { SetupFacilityType } from '@features/organization/setup';

/**
 * Interface CreateFacilityFormValues
 *
 * @description
 * Shape of a single facility row emitted by the create-facilities
 * onboarding form on submit.
 *
 * @since 1.0.0
 */
export interface CreateFacilityFormValues {
  readonly type: SetupFacilityType;
  readonly name: string;
  readonly address: string | null;
}
