import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityToComplianceMapMarker } from '../facility-compliance-marker.utils';

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

describe('facilityToComplianceMapMarker', () => {
  it('maps a compliant facility to a positive marker with the rate in the label', () => {
    const marker = facilityToComplianceMapMarker(facility(), 95);

    expect(marker).toEqual({
      id: 'facility-1',
      latitude: 48.8566,
      longitude: 2.3522,
      statusKind: 'positive',
      label: 'North Building — 95% compliant',
    });
  });

  it('maps a facility below the warning threshold to a critical marker', () => {
    const marker = facilityToComplianceMapMarker(facility(), 40);

    expect(marker?.statusKind).toBe('critical');
    expect(marker?.label).toContain('40%');
  });

  it('maps a facility with no compliance data to a muted marker with a no-data label', () => {
    const marker = facilityToComplianceMapMarker(facility(), null);

    expect(marker?.statusKind).toBe('muted');
    expect(marker?.label).toBe('North Building — no compliance data');
  });

  it('returns null when the facility has no coordinates', () => {
    expect(facilityToComplianceMapMarker(facility({ latitude: null }), 90)).toBeNull();
  });
});
