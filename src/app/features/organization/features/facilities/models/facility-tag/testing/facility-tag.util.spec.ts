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

  // The docblock promises graceful degradation for unknown values, and the
  // signature used to break that promise: an absent value reached `.replace`
  // and threw, taking the whole template down with it. A payload that omits
  // the field is precisely what a fallback is for.
  it.each([[null], [undefined], ['']])(
    'returns a neutral descriptor rather than throwing for %p',
    (value: string | null | undefined) => {
      expect(() => resolveFacilityTag('status', value)).not.toThrow();
      expect(resolveFacilityTag('status', value).label).toBe('—');
    },
  );
});
