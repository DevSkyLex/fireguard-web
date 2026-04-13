import type { CreateFacilityInput } from '@features/organization/features/facilities/models';

/**
 * Type FacilityFormValues
 *
 * @description
 * Shape emitted by the facility form on submit.
 * Matches {@link CreateFacilityInput} for creation,
 * and a subset is used for update.
 *
 * @since 1.0.0
 */
export interface FacilityFormValues {
  readonly type: CreateFacilityInput['type'];
  readonly name: string;
  readonly code: string;
  readonly address: string;
  readonly parentFacilityId: string;
}
