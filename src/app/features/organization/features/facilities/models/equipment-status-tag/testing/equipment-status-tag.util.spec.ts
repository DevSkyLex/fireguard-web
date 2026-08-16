import { resolveEquipmentStatusTag } from '../equipment-status-tag.util';

describe('resolveEquipmentStatusTag', () => {
  it('resolves in_stock as neutral', () => {
    expect(resolveEquipmentStatusTag('in_stock')).toEqual({
      label: 'In stock',
      severity: 'neutral',
      icon: 'lucidePackage',
    });
  });

  it('resolves operational as success', () => {
    expect(resolveEquipmentStatusTag('operational')).toEqual({
      label: 'Operational',
      severity: 'success',
      icon: 'lucideCircleCheck',
    });
  });

  it('resolves under_maintenance as warning', () => {
    expect(resolveEquipmentStatusTag('under_maintenance')).toEqual({
      label: 'Under maintenance',
      severity: 'warning',
      icon: 'lucideWrench',
    });
  });

  it('resolves decommissioned as danger', () => {
    expect(resolveEquipmentStatusTag('decommissioned')).toEqual({
      label: 'Decommissioned',
      severity: 'danger',
      icon: 'lucideBan',
    });
  });
});
