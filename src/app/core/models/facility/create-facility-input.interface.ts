import type { FacilityOutput } from './facility-output.interface';

type FacilityWritableFields = Pick<
  FacilityOutput,
  'type' | 'name' | 'parentFacilityId' | 'code' | 'address' | 'metadata'
>;

/**
 * Type CreateFacilityInput
 *
 * @description
 * Payload used to create a facility within an
 * organization.
 */
export type CreateFacilityInput = Pick<FacilityWritableFields, 'type' | 'name'> &
  Partial<Omit<FacilityWritableFields, 'type' | 'name'>>;
