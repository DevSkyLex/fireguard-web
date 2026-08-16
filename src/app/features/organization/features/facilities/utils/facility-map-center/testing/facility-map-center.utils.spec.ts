import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { resolveFacilityMapCenter } from '../facility-map-center.utils';

function facility(overrides: Partial<FacilityOutput> = {}): FacilityOutput {
  return {
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'HQ',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    latitude: null,
    longitude: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as FacilityOutput;
}

describe('resolveFacilityMapCenter', () => {
  it('returns the preferred coordinates when given', () => {
    expect(resolveFacilityMapCenter({ latitude: 10, longitude: 20 }, [])).toEqual({
      latitude: 10,
      longitude: 20,
    });
  });

  it('averages the located facilities when no preferred coordinates are given', () => {
    const facilities = [
      facility({ latitude: 10, longitude: 0 }),
      facility({ latitude: 20, longitude: 0 }),
      facility({ latitude: 0, longitude: 0, id: 'facility-2' }),
    ];

    expect(resolveFacilityMapCenter(null, facilities)).toEqual({ latitude: 10, longitude: 0 });
  });

  it('ignores facilities missing a coordinate when averaging', () => {
    const facilities = [
      facility({ latitude: 10, longitude: 10 }),
      facility({ latitude: null, longitude: null, id: 'facility-2' }),
    ];

    expect(resolveFacilityMapCenter(null, facilities)).toEqual({ latitude: 10, longitude: 10 });
  });

  it('returns undefined when there is nothing to derive a center from', () => {
    expect(resolveFacilityMapCenter(null, [])).toBeUndefined();
    expect(resolveFacilityMapCenter(null)).toBeUndefined();
  });
});
