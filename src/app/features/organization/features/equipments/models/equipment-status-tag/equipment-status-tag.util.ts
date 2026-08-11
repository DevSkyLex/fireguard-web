import type { EquipmentMaintenanceDueStatus } from '../equipment/equipment-maintenance-due-status.type';
import type { EquipmentStatus } from '../equipment/equipment-output.interface';
import type { EquipmentStatusTagDescriptor } from './equipment-status-tag-descriptor.interface';
import type { EquipmentStatusTagKind } from './equipment-status-tag-kind.type';

/**
 * Lifecycle status descriptors. Only the two states a fleet operator reads as
 * "fine" and "not fine" carry colour — `operational` success, `decommissioned`
 * danger — `in_stock` and `under_maintenance` are transitional and stay
 * neutral/warning, matching the two-ends rule the intervention registry
 * already applies. Ids match `intervention-tag.util.ts`'s `equipmentStatus`
 * kind, which renders the same enum read-only from the linked-resources tab —
 * one translation, two call sites.
 */
const STATUS: Record<EquipmentStatus, EquipmentStatusTagDescriptor> = {
  in_stock: {
    label: $localize`:@@equipmentStatus.inStock:In stock`,
    severity: 'neutral',
    icon: 'lucidePackage',
  },
  operational: {
    label: $localize`:@@equipmentStatus.operational:Operational`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  decommissioned: {
    label: $localize`:@@equipmentStatus.decommissioned:Decommissioned`,
    severity: 'danger',
    icon: 'lucideBan',
  },
  under_maintenance: {
    label: $localize`:@@equipmentStatus.underMaintenance:Under maintenance`,
    severity: 'warning',
    icon: 'lucideWrench',
  },
};

/** Maintenance-due descriptors. `unscheduled` is absence of a schedule, not a compliance state, so it stays neutral rather than warning. */
const MAINTENANCE_DUE_STATUS: Record<EquipmentMaintenanceDueStatus, EquipmentStatusTagDescriptor> =
  {
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

/** Registry indexed by tag kind. */
const REGISTRY: Record<EquipmentStatusTagKind, Record<string, EquipmentStatusTagDescriptor>> = {
  status: STATUS,
  maintenanceDueStatus: MAINTENANCE_DUE_STATUS,
};

/**
 * Function resolveEquipmentStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an equipment status enum value.
 * Falls back to a neutral, humanised descriptor for unknown values so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {EquipmentStatusTagKind} kind - Enum family to resolve against.
 * @param {string} value - Raw enum value.
 *
 * @returns {EquipmentStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveEquipmentStatusTag(
  kind: EquipmentStatusTagKind,
  value: string,
): EquipmentStatusTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
