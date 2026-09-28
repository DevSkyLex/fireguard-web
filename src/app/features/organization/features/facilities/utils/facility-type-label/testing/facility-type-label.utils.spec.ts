import { facilityTypeLabel } from '../facility-type-label.utils';

describe('facilityTypeLabel', () => {
  it('resolves a known facility type to its localized label', () => {
    expect(facilityTypeLabel('building')).toBe('Building');
  });

  it('falls back to a localized "Unknown type" for an unrecognized value', () => {
    expect(facilityTypeLabel('not_a_real_type')).toBe('Unknown type');
  });
});
