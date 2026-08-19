import type { MaintenanceDueStatus } from '../../maintenance-schedule/maintenance-due-status.type';
import type { MaintenanceTagDescriptor } from '../maintenance-tag-descriptor.interface';
import { resolveMaintenanceTag } from '../maintenance-tag.util';

const DUE_STATUS_VALUES: readonly MaintenanceDueStatus[] = [
  'unscheduled',
  'up_to_date',
  'due_soon',
  'overdue',
];

describe('resolveMaintenanceTag', () => {
  it('should resolve every due-status value to a non-fallback descriptor', () => {
    for (const value of DUE_STATUS_VALUES) {
      const descriptor: MaintenanceTagDescriptor = resolveMaintenanceTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label).not.toBe(value.replace(/_/g, ' '));
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should mark overdue as danger and up_to_date as success', () => {
    expect(resolveMaintenanceTag('overdue').severity).toBe('danger');
    expect(resolveMaintenanceTag('up_to_date').severity).toBe('success');
  });

  it('should keep unscheduled neutral, not a compliance warning', () => {
    expect(resolveMaintenanceTag('unscheduled').severity).toBe('neutral');
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: MaintenanceTagDescriptor = resolveMaintenanceTag('some_unknown_value');

    expect(descriptor).toEqual({
      label: 'some unknown value',
      severity: 'neutral',
      icon: 'lucideTag',
    });
  });
});
