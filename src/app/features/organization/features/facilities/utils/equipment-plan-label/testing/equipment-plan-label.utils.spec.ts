import { equipmentPlanDetail, equipmentPlanLabel } from '../equipment-plan-label.utils';

describe('equipmentPlanLabel', () => {
  it("prefers the operator's own words over the type", () => {
    expect(
      equipmentPlanLabel({
        type: 'gas_detector',
        serialNumber: 'SEED-GAS-003',
        locationLabel: 'Server room — rack row A',
      }),
    ).toBe('Server room — rack row A');
  });

  it('falls back to the translated type label, never the raw enum', () => {
    const label = equipmentPlanLabel({
      type: 'fire_extinguisher',
      serialNumber: 'SN-1',
      locationLabel: null,
    });

    expect(label).not.toBe('fire_extinguisher');
    expect(label.toLowerCase()).toContain('extinguisher');
  });

  it('treats a blank location label as absent', () => {
    expect(
      equipmentPlanLabel({ type: 'hydrant', serialNumber: null, locationLabel: '   ' }),
    ).not.toBe('   ');
  });

  it('degrades to the raw value only for a type the catalogue does not know', () => {
    // Defensive: the backend enum could gain a case before the frontend does.
    expect(
      equipmentPlanLabel({
        type: 'not_a_real_type' as never,
        serialNumber: null,
        locationLabel: null,
      }),
    ).toBe('not_a_real_type');
  });
});

describe('equipmentPlanDetail', () => {
  it('adds the type back when the label already used the location', () => {
    const detail = equipmentPlanDetail({
      type: 'gas_detector',
      serialNumber: 'SEED-GAS-003',
      locationLabel: 'Server room',
    });

    expect(detail).toContain('SEED-GAS-003');
    expect(detail.toLowerCase()).toContain('gas');
  });

  it('omits the type when the label is already the type', () => {
    expect(
      equipmentPlanDetail({ type: 'hydrant', serialNumber: 'SN-9', locationLabel: null }),
    ).toBe('SN-9');
  });

  it('returns an empty string rather than a placeholder when there is nothing to add', () => {
    expect(equipmentPlanDetail({ type: 'hydrant', serialNumber: null, locationLabel: null })).toBe(
      '',
    );
  });
});
