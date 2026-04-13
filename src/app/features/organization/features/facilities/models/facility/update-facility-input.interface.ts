import type { CreateFacilityInput } from './create-facility-input.interface';

/**
 * Type UpdateFacilityInput
 *
 * @description
 * Payload used to partially update a facility.
 */
export type UpdateFacilityInput = Partial<Omit<CreateFacilityInput, 'type' | 'parentFacilityId'>>;
