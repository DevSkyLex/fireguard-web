import type { TagOption } from '@shared/components';
import type { EquipmentTagDescriptor } from './equipment-tag-descriptor.interface';
import type { EquipmentTagKind } from './equipment-tag-kind.type';

/**
 * Equipment lifecycle status descriptors (in stock → operational → under
 * maintenance → decommissioned).
 *
 * Colour code: grey (`secondary`) for stocked-but-unassigned equipment, green
 * (`success`) for operational, amber (`warn`) for under maintenance, and red
 * (`danger`) for decommissioned.
 */
const STATUS: Record<string, EquipmentTagDescriptor> = {
  in_stock: {
    label: $localize`:@@equipmentStatus.inStock:In Stock`,
    severity: 'secondary',
    icon: 'pi pi-box',
  },
  operational: {
    label: $localize`:@@equipmentStatus.operational:Operational`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  under_maintenance: {
    label: $localize`:@@equipmentStatus.maintenance:Maintenance`,
    severity: 'warn',
    icon: 'pi pi-wrench',
  },
  decommissioned: {
    label: $localize`:@@equipmentStatus.decommissioned:Decommissioned`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
};

/**
 * Maintenance due descriptors.
 *
 * Orthogonal to the lifecycle status: an `operational` asset can be `overdue`.
 * `unscheduled` is neutral, not a failure — an asset nobody has put on a
 * schedule is not the same as one that missed its date.
 */
const MAINTENANCE_DUE: Record<string, EquipmentTagDescriptor> = {
  overdue: {
    label: $localize`:@@equipmentDue.overdue:Overdue`,
    severity: 'danger',
    icon: 'pi pi-exclamation-circle',
  },
  due_soon: {
    label: $localize`:@@equipmentDue.dueSoon:Due soon`,
    severity: 'warn',
    icon: 'pi pi-clock',
  },
  up_to_date: {
    label: $localize`:@@equipmentDue.upToDate:Up to date`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  unscheduled: {
    label: $localize`:@@equipmentDue.unscheduled:Unscheduled`,
    severity: 'secondary',
    icon: 'pi pi-minus-circle',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<EquipmentTagKind, Record<string, EquipmentTagDescriptor>> = {
  status: STATUS,
  maintenanceDueStatus: MAINTENANCE_DUE,
};

/**
 * Resolves the presentation descriptor for an equipment-owned enum value.
 *
 * Falls back to a neutral, humanised descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveEquipmentTag(kind: EquipmentTagKind, value: string): EquipmentTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-circle',
    }
  );
}

/**
 * Maps a tag family's known values to {@link TagOption} entries for filter
 * selects, preserving the registry's declaration order.
 *
 * @param kind - Enum family to enumerate.
 * @returns The family's descriptors paired with their enum value.
 */
export function equipmentTagOptions(kind: EquipmentTagKind): TagOption[] {
  return Object.entries(REGISTRY[kind]).map(
    ([value, descriptor]: [string, EquipmentTagDescriptor]): TagOption => ({
      value,
      label: descriptor.label,
      severity: descriptor.severity,
      icon: descriptor.icon,
    }),
  );
}
