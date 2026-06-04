import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Type FacilityTypeIconMap
 *
 * @description
 * PrimeIcon mapping keyed by facility type.
 */
export type FacilityTypeIconMap = Readonly<Record<FacilityType, string>>;
