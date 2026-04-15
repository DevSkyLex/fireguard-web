import type { SetupFacilityType } from '@features/organization/setup';

/**
 * Interface CreateFacilityFormValues
 *
 * @description
 * Shape emitted by the create-facility onboarding form on submit.
 *
 * @since 1.0.0
 */
export interface CreateFacilityFormValues {
  readonly type: SetupFacilityType;
  readonly name: string;
  readonly address: string | null;
}
