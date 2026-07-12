import { equipmentTagOptions, resolveEquipmentTag } from '../equipment-tag.util';

describe('resolveEquipmentTag', () => {
  it('resolves equipment status descriptors', () => {
    expect(resolveEquipmentTag('status', 'operational')).toEqual({
      label: 'Operational',
      severity: 'success',
      icon: 'pi pi-check-circle',
    });
    expect(resolveEquipmentTag('status', 'in_stock').severity).toBe('secondary');
    expect(resolveEquipmentTag('status', 'under_maintenance').severity).toBe('warn');
    expect(resolveEquipmentTag('status', 'decommissioned').severity).toBe('danger');
  });

  it('falls back to a neutral descriptor for unknown values', () => {
    const descriptor = resolveEquipmentTag('status', 'awaiting_disposal');
    expect(descriptor.severity).toBe('secondary');
    expect(descriptor.label).toBe('awaiting disposal');
    expect(descriptor.icon).toBe('pi pi-circle');
  });

  it('maps the status family to select options in declaration order', () => {
    expect(equipmentTagOptions('status').map((option) => option.value)).toEqual([
      'in_stock',
      'operational',
      'under_maintenance',
      'decommissioned',
    ]);
  });
});
