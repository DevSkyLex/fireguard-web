import { facilityTagOptions, resolveFacilityTag } from '../facility-tag.util';

describe('resolveFacilityTag', () => {
  it('resolves facility status descriptors', () => {
    expect(resolveFacilityTag('status', 'active')).toEqual({
      label: 'Active',
      severity: 'success',
      icon: 'pi pi-check-circle',
    });
    expect(resolveFacilityTag('status', 'archived')).toEqual({
      label: 'Archived',
      severity: 'secondary',
      icon: 'pi pi-box',
    });
  });

  it('falls back to a neutral descriptor for unknown values', () => {
    const descriptor = resolveFacilityTag('status', 'under_review');
    expect(descriptor.severity).toBe('secondary');
    expect(descriptor.label).toBe('under review');
    expect(descriptor.icon).toBe('pi pi-circle');
  });

  it('maps the status family to select options in declaration order', () => {
    expect(facilityTagOptions('status').map((option) => option.value)).toEqual([
      'active',
      'archived',
    ]);
  });
});
