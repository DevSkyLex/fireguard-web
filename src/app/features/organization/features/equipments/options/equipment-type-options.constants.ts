import type { EquipmentType } from '@features/organization/features/equipments/models';

/**
 * Constant EQUIPMENT_TYPE_OPTIONS
 * @const EQUIPMENT_TYPE_OPTIONS
 *
 * @description
 * Localized select options for the fire-safety equipment type picker,
 * shared by the create/edit form and the equipment table type filter. The
 * backend `EquipmentType` value object is a closed set, so entering the type
 * as free text guaranteed a 400 — this constrains the choice to valid values
 * and renders a raw enum such as `fire_extinguisher` as "Fire extinguisher".
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: EquipmentType }>}
 */
export const EQUIPMENT_TYPE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: EquipmentType;
}> = [
  {
    label: $localize`:@@equipmentType.fireExtinguisher:Fire extinguisher`,
    value: 'fire_extinguisher',
  },
  { label: $localize`:@@equipmentType.smokeDetector:Smoke detector`, value: 'smoke_detector' },
  { label: $localize`:@@equipmentType.heatDetector:Heat detector`, value: 'heat_detector' },
  { label: $localize`:@@equipmentType.sprinkler:Sprinkler`, value: 'sprinkler' },
  { label: $localize`:@@equipmentType.fireAlarmPanel:Fire alarm panel`, value: 'fire_alarm_panel' },
  { label: $localize`:@@equipmentType.hydrant:Hydrant`, value: 'hydrant' },
  { label: $localize`:@@equipmentType.fireDoor:Fire door`, value: 'fire_door' },
  {
    label: $localize`:@@equipmentType.emergencyLighting:Emergency lighting`,
    value: 'emergency_lighting',
  },
  { label: $localize`:@@equipmentType.accessControl:Access control`, value: 'access_control' },
  { label: $localize`:@@equipmentType.camera:Camera`, value: 'camera' },
  { label: $localize`:@@equipmentType.gasDetector:Gas detector`, value: 'gas_detector' },
  { label: $localize`:@@equipmentType.other:Other`, value: 'other' },
];
