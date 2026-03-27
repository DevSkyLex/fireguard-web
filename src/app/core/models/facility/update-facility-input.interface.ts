import type { CreateFacilityInput } from './create-facility-input.interface';

export type UpdateFacilityInput = Partial<Omit<CreateFacilityInput, 'type' | 'parentFacilityId'>>;
