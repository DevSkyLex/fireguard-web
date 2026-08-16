import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { EquipmentStatusTagDescriptor } from './equipment-status-tag-descriptor.interface';

/**
 * Descriptors for `FacilityPlanOverlayEquipment.status`, read read-only from
 * the sibling equipments feature for the plan-overlay pin only — this
 * feature does not own the equipment status enum. Ids match
 * `equipment-status-tag.util.ts`'s (equipments feature) and
 * `intervention-tag.util.ts`'s `equipmentStatus` kind, which render the same
 * enum elsewhere: one translation, three call sites. `EquipmentStatus` is a
 * closed union and this map is total, so no unknown-value fallback branch is
 * needed — a future status addition is a compile error here, not a silently
 * humanised label.
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

/**
 * Function resolveEquipmentStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an equipment status enum value.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {EquipmentStatus} status - The equipment's lifecycle status.
 *
 * @returns {EquipmentStatusTagDescriptor} The matching descriptor.
 */
export function resolveEquipmentStatusTag(status: EquipmentStatus): EquipmentStatusTagDescriptor {
  return STATUS[status];
}
