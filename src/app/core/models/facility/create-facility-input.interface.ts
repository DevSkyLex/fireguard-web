import type { FacilityOutput } from './facility-output.interface';

type FacilityWritableFields = Pick<
  FacilityOutput,
  'type' | 'name' | 'parentFacilityId' | 'code' | 'address' | 'metadata'
>;

export type CreateFacilityInput = Pick<FacilityWritableFields, 'type' | 'name'> &
  Partial<Omit<FacilityWritableFields, 'type' | 'name'>>;
