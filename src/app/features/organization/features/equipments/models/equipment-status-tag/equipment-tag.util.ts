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

/**
 * Equipment type descriptors, one per {@link EquipmentType} value. Neutral
 * (`secondary`) severity throughout — a fire-safety equipment type carries no
 * inherent risk verdict, only an identity — so only the icon varies. Labels
 * reuse the same `$localize` ids as `EQUIPMENT_TYPE_OPTIONS` (the create/edit
 * form and table filter): the source text is identical, so the translation
 * stays a single fact in the catalog instead of two.
 */
const TYPE: Record<string, EquipmentTagDescriptor> = {
  fire_extinguisher: {
    label: $localize`:@@equipmentType.fireExtinguisher:Fire extinguisher`,
    severity: 'secondary',
    icon: 'pi pi-shield',
  },
  smoke_detector: {
    label: $localize`:@@equipmentType.smokeDetector:Smoke detector`,
    severity: 'secondary',
    icon: 'pi pi-bell',
  },
  heat_detector: {
    label: $localize`:@@equipmentType.heatDetector:Heat detector`,
    severity: 'secondary',
    icon: 'pi pi-sun',
  },
  sprinkler: {
    label: $localize`:@@equipmentType.sprinkler:Sprinkler`,
    severity: 'secondary',
    icon: 'pi pi-cloud',
  },
  fire_alarm_panel: {
    label: $localize`:@@equipmentType.fireAlarmPanel:Fire alarm panel`,
    severity: 'secondary',
    icon: 'pi pi-megaphone',
  },
  hydrant: {
    label: $localize`:@@equipmentType.hydrant:Hydrant`,
    severity: 'secondary',
    icon: 'pi pi-map-marker',
  },
  fire_door: {
    label: $localize`:@@equipmentType.fireDoor:Fire door`,
    severity: 'secondary',
    icon: 'pi pi-sign-in',
  },
  emergency_lighting: {
    label: $localize`:@@equipmentType.emergencyLighting:Emergency lighting`,
    severity: 'secondary',
    icon: 'pi pi-lightbulb',
  },
  access_control: {
    label: $localize`:@@equipmentType.accessControl:Access control`,
    severity: 'secondary',
    icon: 'pi pi-lock',
  },
  camera: {
    label: $localize`:@@equipmentType.camera:Camera`,
    severity: 'secondary',
    icon: 'pi pi-camera',
  },
  gas_detector: {
    label: $localize`:@@equipmentType.gasDetector:Gas detector`,
    severity: 'secondary',
    icon: 'pi pi-exclamation-triangle',
  },
  other: {
    label: $localize`:@@equipmentType.other:Other`,
    severity: 'secondary',
    icon: 'pi pi-box',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<EquipmentTagKind, Record<string, EquipmentTagDescriptor>> = {
  status: STATUS,
  maintenanceDueStatus: MAINTENANCE_DUE,
  type: TYPE,
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
