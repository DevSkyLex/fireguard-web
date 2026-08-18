import type { MaintenanceDueStatus } from '../maintenance-schedule/maintenance-due-status.type';
import type { MaintenanceTagDescriptor } from './maintenance-tag-descriptor.interface';

/**
 * Due-status descriptors. `unscheduled` is the absence of a schedule, not a
 * compliance state, so it stays neutral rather than warning — the same call
 * `equipment-status-tag.util.ts`'s `maintenanceDueStatus` kind already made
 * for the same four values, denormalized read-only onto
 * `EquipmentOutput.maintenanceDueStatus`. The ids are reused byte for byte
 * (`equipment.maintenanceDue.*`) so the two call sites share one
 * translation rather than drifting.
 */
const DUE_STATUS: Record<MaintenanceDueStatus, MaintenanceTagDescriptor> = {
  unscheduled: {
    label: $localize`:@@equipment.maintenanceDue.unscheduled:Unscheduled`,
    severity: 'neutral',
    icon: 'lucideCalendarOff',
  },
  up_to_date: {
    label: $localize`:@@equipment.maintenanceDue.upToDate:Up to date`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  due_soon: {
    label: $localize`:@@equipment.maintenanceDue.dueSoon:Due soon`,
    severity: 'warning',
    icon: 'lucideClock',
  },
  overdue: {
    label: $localize`:@@equipment.maintenanceDue.overdue:Overdue`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
};

/**
 * Function resolveMaintenanceTag
 *
 * @description
 * Resolves the presentation descriptor for a `MaintenanceDueStatus` value.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * UI degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw due-status value.
 *
 * @returns {MaintenanceTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveMaintenanceTag(value: string): MaintenanceTagDescriptor {
  return (
    DUE_STATUS[value as MaintenanceDueStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
