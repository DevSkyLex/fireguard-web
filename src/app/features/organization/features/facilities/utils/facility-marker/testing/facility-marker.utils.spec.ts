import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityToMapMarker } from '../facility-marker.utils';

function facility(overrides: Partial<FacilityOutput> = {}): FacilityOutput {
  return {
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'North Building',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    latitude: 48.8566,
    longitude: 2.3522,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as FacilityOutput;
}

describe('facilityToMapMarker', () => {
  it('maps an active, located facility to a neutral marker', () => {
    expect(facilityToMapMarker(facility())).toEqual({
      id: 'facility-1',
      latitude: 48.8566,
      longitude: 2.3522,
      statusKind: 'neutral',
      label: 'North Building',
    });
  });

  it('maps an archived facility to a muted marker', () => {
    const marker = facilityToMapMarker(facility({ status: 'archived' }));

    expect(marker?.statusKind).toBe('muted');
  });

  it('returns null when latitude is missing', () => {
    expect(facilityToMapMarker(facility({ latitude: null }))).toBeNull();
  });

  it('returns null when longitude is missing', () => {
    expect(facilityToMapMarker(facility({ longitude: undefined }))).toBeNull();
  });
});
