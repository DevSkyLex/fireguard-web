import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { resolveFacilityCity, toFacilityCityMetadata } from '../facility-city.utils';

const facility = (metadata: Readonly<Record<string, string | null>>): FacilityOutput =>
  ({ metadata }) as unknown as FacilityOutput;

describe('resolveFacilityCity', () => {
  it('reads the city out of metadata', () => {
    expect(resolveFacilityCity(facility({ city: 'Paris' }))).toBe('Paris');
  });

  it('returns null when metadata carries no city', () => {
    expect(resolveFacilityCity(facility({}))).toBeNull();
  });

  it('returns null for a blank city rather than an empty string', () => {
    expect(resolveFacilityCity(facility({ city: '  ' }))).toBeNull();
  });
});

describe('toFacilityCityMetadata', () => {
  it('wraps a trimmed city under the metadata key', () => {
    expect(toFacilityCityMetadata('  Lyon  ')).toEqual({ city: 'Lyon' });
  });

  it('returns undefined for a blank city, so the field is omitted from the payload', () => {
    expect(toFacilityCityMetadata('   ')).toBeUndefined();
  });
});
